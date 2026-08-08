export type DashboardStat = {
  id: string
  label: string
  value: string
}

export type DashboardActivity = {
  id: string
  title: string
  description: string
  timestamp: string
}

export type DashboardData = {
  stats: DashboardStat[]
  recentActivity: DashboardActivity[]
}
