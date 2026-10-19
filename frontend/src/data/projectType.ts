import type { ProjectType } from '@/types'

// The kinds of work a project can be. The type labels the project and sets what
// it starts with (see docs/features/projects.md for what each type starts with).
export const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: 'blank', label: 'Blank' },
  { value: 'software', label: 'Software' },
  { value: 'music_release', label: 'Music release' },
  { value: 'video', label: 'Video' },
  { value: 'event', label: 'Event' },
  { value: 'marketing_campaign', label: 'Marketing campaign' },
  { value: 'writing', label: 'Writing or content' },
  { value: 'personal', label: 'Personal' },
]

export function projectTypeLabel(type: ProjectType | undefined): string {
  return PROJECT_TYPES.find((t) => t.value === (type ?? 'blank'))?.label ?? 'Blank'
}
