import type { Activity, ActivitySubjectType, ActivityValue } from '@/types'

// Mirrors Activity::PAGE_SIZE on the server: how many entries one item's log returns.
export const ACTIVITY_LIMIT = 100

// What the item is called in "Created this ...". Files are documents, sheets and Collections.
export const SUBJECT_NOUN: Record<ActivitySubjectType, string> = {
  Task: 'task',
  Document: 'file',
  Epic: 'epic',
  Initiative: 'initiative',
  Milestone: 'milestone',
}

// Field names as the server logs them (see the `audited` line of each model).
const FIELD_LABEL: Record<string, string> = {
  due_date: 'due date',
  start_date: 'start date',
  target_date: 'target date',
  doc_type: 'type',
  parent: 'parent task',
  story_points: 'story points',
  estimate_hours: 'estimate (hours)',
}

const DATE_FIELDS = new Set(['start_date', 'due_date', 'target_date'])

// Enum values as the server logs them, worded the way the app shows them.
const ENUM_LABEL: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  planned: 'Planned',
  active: 'Active',
  document: 'Document',
  spreadsheet: 'Spreadsheet',
  table: 'Collection',
  file: 'File',
  now: 'Now',
  next: 'Next',
  later: 'Later',
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

const ENUM_FIELDS = new Set(['status', 'doc_type', 'horizon', 'priority'])

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "2026-11-05" -> "Nov 5, 2026"; anything that is not a plain date is returned as it came.
function formatDateValue(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value
  return `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}, ${match[1]}`
}

export function formatActivityValue(field: string, value: ActivityValue): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value === null) return ''
  if (typeof value === 'number') return String(value)
  if (DATE_FIELDS.has(field)) return formatDateValue(value)
  if (ENUM_FIELDS.has(field)) return ENUM_LABEL[value] ?? value
  if (field === 'title') return `"${value}"`
  return value
}

// One change as a sentence: "Changed status from To Do to Done".
export function describeChange(field: string, change: [ActivityValue, ActivityValue] | null): string {
  const label = FIELD_LABEL[field] ?? field.replace(/_/g, ' ')
  if (change === null) return `Edited the ${label}`
  const [from, to] = change
  if (from === null) return `Set ${label} to ${formatActivityValue(field, to)}`
  if (to === null) return `Cleared ${label} (was ${formatActivityValue(field, from)})`
  return `Changed ${label} from ${formatActivityValue(field, from)} to ${formatActivityValue(field, to)}`
}

// What an entry says happened, one line per change.
export function activityLines(activity: Activity, subjectType: ActivitySubjectType): string[] {
  if (activity.action === 'created') return [`Created this ${SUBJECT_NOUN[subjectType]}`]
  return Object.entries(activity.changes).map(([field, change]) => describeChange(field, change))
}

// Work done with no signed-in user (imports, background jobs) or by someone since removed has no name.
export function activityActor(activity: Activity): string {
  return activity.actor_name ?? 'Someone'
}
