import type { Task, TaskField, TaskFieldType, TaskFieldValue, TaskFieldValues } from '@/types'

// Mirrors TaskFieldType in backend/app/models/task_field_type.rb: what each
// kind of custom task field stores and accepts, plus the display helpers.

export const TASK_FIELD_TYPES: { type: TaskFieldType; label: string; hint: string }[] = [
  { type: 'tags', label: 'Tags', hint: 'Short labels you type in, different on every task.' },
  { type: 'dropdown', label: 'Dropdown', hint: 'One choice from a list you set.' },
  { type: 'checkbox', label: 'Checkbox', hint: 'Yes or no.' },
  { type: 'rating', label: 'Rating', hint: 'One to five stars.' },
  { type: 'vote', label: 'Vote', hint: 'Each member can vote once.' },
]

export const RATING_MAX = 5
export const MAX_TAGS = 20
export const MAX_LABEL_LENGTH = 40
export const MAX_OPTIONS = 30
export const MAX_NAME_LENGTH = 100

export function typeLabel(type: TaskFieldType): string {
  return TASK_FIELD_TYPES.find((t) => t.type === type)?.label ?? type
}

// ── Labels (tags and dropdown choices) ───────────────────────────────────────

// Trims labels and drops blanks and repeats (ignoring case).
export function tidyLabels(list: string[]): string[] {
  const seen = new Set<string>()
  const tidy: string[] = []
  for (const item of list) {
    const label = item.trim()
    if (label && !seen.has(label.toLowerCase())) {
      seen.add(label.toLowerCase())
      tidy.push(label)
    }
  }
  return tidy
}

// A dropdown's choices as typed: one per line, or separated by commas.
export function parseOptions(text: string): string[] {
  return tidyLabels(text.split(/[\n,]/))
}

// Adds the typed text (one tag, or several separated by commas) to the tags,
// keeping at most MAX_TAGS and never a repeat.
export function addTags(tags: string[], text: string): string[] {
  return tidyLabels([...tags, ...text.split(',')]).slice(0, MAX_TAGS)
}

export function removeTag(tags: string[], tag: string): string[] {
  return tags.filter((t) => t !== tag)
}

// ── Defining a field ─────────────────────────────────────────────────────────

export interface FieldDraft {
  name: string
  field_type: TaskFieldType
  options: string[]
}

// The first problem with a field about to be saved, or null when it is fine.
// `otherNames` are the Space's other fields (names are unique ignoring case).
export function validateFieldDraft(draft: FieldDraft, otherNames: string[] = []): string | null {
  const name = draft.name.trim()
  if (!name) return 'Give the field a name.'
  if (name.length > MAX_NAME_LENGTH) return `Field names are at most ${MAX_NAME_LENGTH} characters.`
  if (otherNames.some((other) => other.trim().toLowerCase() === name.toLowerCase())) return `There is already a field called ${name}.`
  if (draft.field_type === 'dropdown') {
    const options = tidyLabels(draft.options)
    if (options.length === 0) return 'Add at least one choice.'
    if (options.length > MAX_OPTIONS) return `A dropdown can have at most ${MAX_OPTIONS} choices.`
    if (options.some((option) => option.length > MAX_LABEL_LENGTH)) return `Choices are at most ${MAX_LABEL_LENGTH} characters.`
  }
  return null
}

// ── Reading a task's values ──────────────────────────────────────────────────

export function valueOf(task: Pick<Task, 'field_values'>, field: TaskField): TaskFieldValue | undefined {
  return task.field_values?.[String(field.id)]
}

export function tagsOf(task: Pick<Task, 'field_values'>, field: TaskField): string[] {
  const value = valueOf(task, field)
  return Array.isArray(value) ? (value as string[]) : []
}

export function choiceOf(task: Pick<Task, 'field_values'>, field: TaskField): string {
  const value = valueOf(task, field)
  return typeof value === 'string' && field.options.includes(value) ? value : ''
}

export function isChecked(task: Pick<Task, 'field_values'>, field: TaskField): boolean {
  return valueOf(task, field) === true
}

// 0 when the task has no rating.
export function ratingOf(task: Pick<Task, 'field_values'>, field: TaskField): number {
  const value = valueOf(task, field)
  return typeof value === 'number' ? value : 0
}

export function votersOf(task: Pick<Task, 'field_values'>, field: TaskField): number[] {
  const value = valueOf(task, field)
  return Array.isArray(value) ? (value as number[]) : []
}

export function hasVoted(voters: number[], userId: number | null | undefined): boolean {
  return userId != null && voters.includes(userId)
}

// Clicking the star that is already the rating takes the rating away.
export function nextRating(current: number, clicked: number): number | null {
  return clicked === current ? null : clicked
}

// ── Showing a value ──────────────────────────────────────────────────────────

// Text for a value, or null when the task has nothing worth showing.
export function displayValue(task: Pick<Task, 'field_values'>, field: TaskField): string | null {
  switch (field.field_type) {
    case 'tags': {
      const tags = tagsOf(task, field)
      return tags.length ? tags.join(', ') : null
    }
    case 'dropdown':
      return choiceOf(task, field) || null
    case 'checkbox':
      return isChecked(task, field) ? 'Yes' : null
    case 'rating': {
      const rating = ratingOf(task, field)
      return rating ? '★'.repeat(rating) + '☆'.repeat(RATING_MAX - rating) : null
    }
    case 'vote': {
      const count = votersOf(task, field).length
      return count ? `${count} ${count === 1 ? 'vote' : 'votes'}` : null
    }
  }
}

// The same value read aloud by a screen reader (stars are not words).
export function spokenValue(task: Pick<Task, 'field_values'>, field: TaskField): string | null {
  if (field.field_type === 'rating') {
    const rating = ratingOf(task, field)
    return rating ? `${rating} of ${RATING_MAX} stars` : null
  }
  return displayValue(task, field)
}

export interface FieldSummary {
  field: TaskField
  text: string
  spoken: string
}

// The fields a task has a value for, in field order, for the chips on its row.
export function fieldSummaries(fields: TaskField[], task: Pick<Task, 'field_values'>): FieldSummary[] {
  return fields.flatMap((field) => {
    const text = displayValue(task, field)
    return text ? [{ field, text, spoken: spokenValue(task, field) ?? text }] : []
  })
}

// ── Keeping the cached task lists current ────────────────────────────────────

export function withFieldValues(tasks: Task[], taskId: number, fieldValues: TaskFieldValues): Task[] {
  return tasks.map((task) => (task.id === taskId ? { ...task, field_values: fieldValues } : task))
}
