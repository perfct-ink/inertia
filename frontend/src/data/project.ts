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
