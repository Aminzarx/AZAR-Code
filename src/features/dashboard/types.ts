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

export type DashboardReminder = {
  id: string
  title: string
  timestamp: string
}

/**
 * design-system.md §14 point 3 — one concrete, tappable action row. `target`
 * names the screen this row navigates to; each row's own list screen owns
 * the actual filtering (this section only ever routes to a plain,
 * already-existing list, never invents new filter plumbing — see the
 * dashboard delivery report for the reasoning).
 */
export type DashboardNeedsAttentionItem = {
  id: string
  label: string
  tone: 'attention' | 'inProgress'
  target: 'ApplicantList' | 'DealList'
}

export type DashboardData = {
  stats: DashboardStat[]
  needsAttention: DashboardNeedsAttentionItem[]
  recentActivity: DashboardActivity[]
  upcomingReminders: DashboardReminder[]
}
