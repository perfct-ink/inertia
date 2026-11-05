import { formatDistanceToNow, parseISO } from 'date-fns'
import type { AppNotification } from '@/types'

// Where a notification takes you when opened (its subject's page), or null.
export function notificationPath(subjectType: string | null, subjectId: number | null): string | null {
  if (!subjectType || subjectId == null) return null
  if (subjectType === 'Task') return '/tasks?view=kanban'
  if (subjectType === 'Document') return `/documents/${subjectId}`
  return null
}

export function notificationAge(n: Pick<AppNotification, 'created_at'>): string {
  return `${formatDistanceToNow(parseISO(n.created_at))} ago`
}
