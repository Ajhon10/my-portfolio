export interface DashboardSummary {
	projects: { total: number; published: number }
	conversations: number
	requestStatuses: { status: string; count: number }[]
	tech: { total: number; categories: { label: string | null; count: number }[] }
	today: string
	activity: { day: string; requests: number; conversations: number }[]
}
