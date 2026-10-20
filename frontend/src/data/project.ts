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
