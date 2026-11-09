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

export type PortfolioSortKey = 'name' | 'owner' | 'status' | 'target_date' | 'percent'

// The sortable columns of the portfolio table, in order.
export const PORTFOLIO_COLUMNS: { key: PortfolioSortKey; label: string }[] = [
  { key: 'name', label: 'Project' },
  { key: 'owner', label: 'Owner' },
  { key: 'status', label: 'Status' },
  { key: 'target_date', label: 'Dates' },
  { key: 'percent', label: 'Progress' },
]

// Portfolio rows ordered by a column, ascending or descending; empty owners and
// dates sort last. A copy: the input is not changed.
export function sortPortfolio<T extends { name: string; owner_name: string | null; project_status: ProjectStatus; target_date: string | null; percent: number }>(
  rows: T[], key: PortfolioSortKey, dir: 'asc' | 'desc',
): T[] {
  const factor = dir === 'asc' ? 1 : -1
  const order = PROJECT_STATUSES.map((s) => s.value)
  return [...rows].sort((a, b) => {
    switch (key) {
      case 'name': return a.name.localeCompare(b.name) * factor
      case 'percent': return (a.percent - b.percent) * factor
      case 'status': return (order.indexOf(a.project_status) - order.indexOf(b.project_status)) * factor || a.name.localeCompare(b.name)
      case 'owner':
        if (!a.owner_name || !b.owner_name) return a.owner_name === b.owner_name ? a.name.localeCompare(b.name) : a.owner_name ? -1 : 1
        return a.owner_name.localeCompare(b.owner_name) * factor || a.name.localeCompare(b.name)
      case 'target_date':
        if (!a.target_date || !b.target_date) return a.target_date === b.target_date ? a.name.localeCompare(b.name) : a.target_date ? -1 : 1
        return a.target_date.localeCompare(b.target_date) * factor || a.name.localeCompare(b.name)
    }
  })
}
