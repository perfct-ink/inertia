import { formatDistanceToNow, parseISO } from 'date-fns'
import type { AppNotification } from '@/types'

// The page that lists each kind of subject a notification can be about
// (tasks open the Workboard, planning items their list).
const SUBJECT_PATHS: Record<string, string> = {
  Task: '/tasks?view=kanban',
  Epic: '/epics',
  Initiative: '/initiatives',
  Milestone: '/milestones',
}

// Where a notification takes you when opened (its subject's page), or null.
export function notificationPath(subjectType: string | null, subjectId: number | null): string | null {
  if (!subjectType || subjectId == null) return null
  if (subjectType === 'Document') return `/documents/${subjectId}`
  return SUBJECT_PATHS[subjectType] ?? null
}

export function notificationAge(n: Pick<AppNotification, 'created_at'>): string {
  return `${formatDistanceToNow(parseISO(n.created_at))} ago`
}
