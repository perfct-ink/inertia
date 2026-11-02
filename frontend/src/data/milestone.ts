import type { MilestoneHealth, PlanningStatus } from '@/types'

export const PLANNING_STATUSES: PlanningStatus[] = ['planned', 'active', 'done']

export const HEALTH_LABEL: Record<MilestoneHealth, string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  off_track: 'Off track',
}

// Mirrors Milestone#health on the server: only the label is shown here.
export function healthLabel(health: MilestoneHealth): string {
  return HEALTH_LABEL[health]
}

// Soonest target date first, undated last, ties by title. Shared by the
// roadmap lanes and the Gantt's milestone rows so they list milestones alike.
export function compareByTargetDate(a: { title: string; target_date: string | null }, b: { title: string; target_date: string | null }): number {
  if (a.target_date === b.target_date) return a.title.localeCompare(b.title)
  if (!a.target_date) return 1
  if (!b.target_date) return -1
  return a.target_date.localeCompare(b.target_date)
}
