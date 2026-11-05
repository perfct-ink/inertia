// Where a new document goes when no project is open and no folder was chosen.
export const PERSONAL_PROJECT_NAME = 'Personal Project'

// Emojis offered when choosing a project's icon; any other emoji can be typed.
export const PROJECT_EMOJIS = [
  '🚀', '📁', '📌', '🎯', '💡', '🛠️', '📈', '🧪',
  '🎨', '🎵', '📚', '🏠', '🌱', '⭐', '🔥', '💬',
  '🧭', '📦', '🗓️', '✅', '🐞', '🔒', '🌍', '💼',
]

// What a project shows as its icon: an uploaded image wins over an emoji;
// neither means the default project icon.
export type ProjectIconKind = { image: string } | { emoji: string } | null

export function projectIconOf(project: { icon?: string | null; image_url?: string | null }): ProjectIconKind {
  if (project.image_url) return { image: project.image_url }
  if (project.icon?.trim()) return { emoji: project.icon.trim() }
  return null
}

// Whether the page at `pathname` is the one a navigation link opens. A link
// may carry a query (`/tasks?view=backlog`), which doesn't change the page.
export function isActivePath(pathname: string, link: string): boolean {
  return pathname === link.split('?')[0]
}
import type { ProjectStatus } from '@/types'

export const PROJECT_STATUSES: { value: ProjectStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'done', label: 'Done' },
]

export function projectStatusLabel(status: ProjectStatus | undefined): string {
  return PROJECT_STATUSES.find((s) => s.value === (status ?? 'planned'))?.label ?? 'Planned'
}
