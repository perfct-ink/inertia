import type { Idea, IdeaStatus } from '@/types'

export const IDEA_STATUS_LABEL: Record<IdeaStatus, string> = { open: 'Open', promoted: 'Promoted', declined: 'Declined' }

// Open ideas first (newest first), then promoted, then declined.
export function sortIdeas(ideas: Idea[]): Idea[] {
  const order: Record<IdeaStatus, number> = { open: 0, promoted: 1, declined: 2 }
  return [...ideas].sort((a, b) => order[a.status] - order[b.status] || b.created_at.localeCompare(a.created_at))
}

// Where a promoted idea lives now.
export function promotedPath(idea: Idea): string | null {
  if (idea.status !== 'promoted') return null
  return idea.promoted_type === 'Initiative' ? '/initiatives' : idea.promoted_type === 'Epic' ? '/epics' : null
}
