export type DashboardStat = {
  id: 'properties' | 'applicants' | 'contracts' | 'deals'
  label: string
  value: number
}

/**
 * v1.3.0 (design batch 2) — one row of «پیگیری‌های امروز»: a not-done
 * reminder due today or already overdue, with the applicant's phone when
 * the reminder belongs to one, so the broker can call straight from Home.
 */
export type DashboardFollowUp = {
  id: string
  title: string
  subtitle: string | null
  /** «۱۰:۳۰» for today, «دیروز» / «۳ روز پیش» for an overdue one. */
  timeLabel: string
  isOverdue: boolean
  phoneNumber: string | null
}

/** Applicants (active) with at least one suitable active property file. */
export type DashboardMatchSummary = {
  matchCount: number
  applicantCount: number
}

export type DashboardData = {
  stats: DashboardStat[]
  followUps: DashboardFollowUp[]
  /** Any not-done reminder whose time has passed — the bell's red dot. */
  hasOverdue: boolean
  matches: DashboardMatchSummary
}
