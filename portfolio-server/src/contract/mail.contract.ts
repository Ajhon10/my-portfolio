export interface MailContract {
	send(data: { to: string; subject: string; html: string }): Promise<void>
	notifyOwnerOfNewRequest(data: { fullName: string; email: string; projectType: string; description: string }): Promise<void>
	sendReplyToClient(data: { to: string; clientName: string; message: string }): Promise<void>
}
