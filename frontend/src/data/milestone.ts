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
