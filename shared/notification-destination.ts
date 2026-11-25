/** Resolve existing notifications as well as newly generated deep links. */
export function notificationDestination(
	notification: { type: string; link?: string | null; metadata?: Record<string, unknown> | null },
	role?: string,
): string | null {
	const link = notification.link || ''
	// Notifications may only navigate within this application.
	if (link && (!link.startsWith('/') || link.startsWith('//') || /[\\\u0000-\u001f]/.test(link))) return null
	const url = new URL(link || '/', 'https://portfolio.invalid')
	const requestId = notification.metadata?.requestId || url.searchParams.get('requestId')
	if (typeof requestId === 'string' && requestId.length > 0 && requestId.length <= 128) {
		const destination = role === 'CLIENT' ? '/client/portal' : '/admin/client-requests'
		return `${destination}?requestId=${encodeURIComponent(requestId)}`
	}
	if (notification.type === 'CLIENT_REQUEST' || notification.type === 'CLIENT_INQUIRY')
		return role === 'CLIENT' ? '/client/portal' : '/admin/client-requests'
	return link || null
}
