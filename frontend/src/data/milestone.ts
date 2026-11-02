import type { Milestone, MilestoneHealth, PlanningStatus } from '@/types'

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

// How many unfinished milestones are on track, at risk and off track.
export function healthCounts(milestones: Pick<Milestone, 'status' | 'health'>[]): Record<MilestoneHealth, number> {
  const counts: Record<MilestoneHealth, number> = { on_track: 0, at_risk: 0, off_track: 0 }
  milestones.filter((m) => m.status !== 'done').forEach((m) => { counts[m.health] += 1 })
  return counts
}

// The unfinished milestone with the soonest target date (a late one counts),
// or null when none has a date.
export function nextMilestone<T extends Pick<Milestone, 'status' | 'title' | 'target_date'>>(milestones: T[]): T | null {
  return milestones.filter((m) => m.status !== 'done' && m.target_date).sort(compareByTargetDate)[0] ?? null
}
