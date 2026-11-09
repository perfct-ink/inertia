import type { CheckInStatus, MilestoneHealth, Task } from '@/types'
import { recurrenceLabel } from './recurrence'

// The statuses an owner picks in a check-in (mirrors TaskCheckIn::STATUSES on the server).
export const CHECK_IN_STATUSES: CheckInStatus[] = ['on_track', 'at_risk', 'blocked']

export const CHECK_IN_STATUS_LABEL: Record<CheckInStatus, string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  blocked: 'Blocked',
}

// The pill colour each status borrows from the milestone health badge: blocked is the red one.
export const CHECK_IN_STATUS_HEALTH: Record<CheckInStatus, MilestoneHealth> = {
  on_track: 'on_track',
  at_risk: 'at_risk',
  blocked: 'off_track',
}

// "Ongoing · weekly" or "Ongoing · every 2 weeks" for an ongoing task, "Check-in overdue"
// once its day has passed unanswered; null for any other task.
export function checkInLabel(task: Pick<Task, 'ongoing' | 'check_in_recurrence' | 'check_in_stale'>): string | null {
  if (!task.ongoing) return null
  if (task.check_in_stale) return 'Check-in overdue'
  const schedule = recurrenceLabel(task.check_in_recurrence)
  return schedule ? `Ongoing · ${schedule.charAt(0).toLowerCase()}${schedule.slice(1)}` : 'Ongoing'
}
