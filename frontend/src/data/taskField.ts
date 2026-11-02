import type { Task, TaskField, TaskFieldType, TaskFieldValue, TaskFieldValues } from '@/types'

// Mirrors TaskFieldType in backend/app/models/task_field_type.rb: what each
// kind of custom task field stores and accepts, plus the display helpers.

export const TASK_FIELD_TYPES: { type: TaskFieldType; label: string; hint: string }[] = [
  { type: 'text', label: 'Text', hint: 'Any text, such as a note or a link.' },
  { type: 'integer', label: 'Whole number', hint: 'A number without decimals, such as a count.' },
  { type: 'number', label: 'Number', hint: 'A number that can have decimals, such as a cost.' },
  { type: 'date', label: 'Date', hint: 'A day, picked from a calendar.' },
  { type: 'datetime', label: 'Date and time (UTC)', hint: 'A day and a time, entered and shown in UTC.' },
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

// The name a field is shown under in the edit dialog: a date and time says its zone.
export function fieldTitle(field: Pick<TaskField, 'name' | 'field_type'>): string {
  return field.field_type === 'datetime' ? `${field.name} (UTC)` : field.name
}

// ── Text, numbers and dates ──────────────────────────────────────────────────

// Typed into a box and saved when it loses focus or Enter is pressed. They are
// the scalar types Collection fields use (FieldValue in the backend), except
// yes/no, which a task keeps as a checkbox.
export type ScalarType = 'text' | 'integer' | 'number' | 'date' | 'datetime'

interface ScalarInfo {
  // The <input type> that edits it.
  input: 'text' | 'number' | 'date' | 'datetime-local'
  step?: string
  // Completes "<field name> must be ..." when the text doesn't fit.
  expected: string
}

const SCALAR_TYPES: Record<ScalarType, ScalarInfo> = {
  text: { input: 'text', expected: 'text' },
  integer: { input: 'number', step: '1', expected: 'a whole number' },
  number: { input: 'number', step: 'any', expected: 'a number' },
  date: { input: 'date', expected: 'a date (YYYY-MM-DD)' },
  datetime: { input: 'datetime-local', expected: 'a date and time' },
}

const INTEGER = /^-?\d+$/
const NUMBER = /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i
const DATE = /^\d{4}-\d{2}-\d{2}$/
const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/

export function isScalarType(type: TaskFieldType): type is ScalarType {
  return type in SCALAR_TYPES
}

export function scalarInput(type: ScalarType): Pick<ScalarInfo, 'input' | 'step'> {
  const { input, step } = SCALAR_TYPES[type]
  return { input, step }
}

function isRealDate(text: string): boolean {
  const date = new Date(`${text}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text
}

// A stored value as the box shows it ('' when unset). Dates and times are shown in UTC.
export function scalarToDraft(field: TaskField, value: TaskFieldValue | undefined): string {
  if (value === undefined || value === null || value === '') return ''
  if (field.field_type === 'datetime') {
    const date = new Date(String(value))
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 16)
  }
  return String(value)
}

// The value to store for the text in the box, or null when it is empty. Call
// scalarDraftError first: this assumes the text fits.
export function draftToScalar(field: TaskField, text: string): TaskFieldValue | null {
  const trimmed = text.trim()
  if (trimmed === '') return null
  switch (field.field_type) {
    case 'text': return text
    case 'integer':
    case 'number': return Number(trimmed)
    case 'datetime': return trimmed.length === 16 ? `${trimmed}:00Z` : `${trimmed}Z`
    default: return trimmed
  }
}

// Why the text can't be stored in this field, or null if it can (or is empty).
export function scalarDraftError(field: TaskField, text: string): string | null {
  const trimmed = text.trim()
  if (trimmed === '' || !isScalarType(field.field_type)) return null
  const fits: Record<ScalarType, boolean> = {
    text: true,
    integer: INTEGER.test(trimmed) && Number.isSafeInteger(Number(trimmed)),
    number: NUMBER.test(trimmed) && Number.isFinite(Number(trimmed)),
    date: DATE.test(trimmed) && isRealDate(trimmed),
    datetime: DATETIME_LOCAL.test(trimmed) && isRealDate(trimmed.slice(0, 10)),
  }
  return fits[field.field_type] ? null : `${field.name} must be ${SCALAR_TYPES[field.field_type].expected}`
}

// What to save for the text typed into a box: the new value (null clears it), or
// undefined when it already is what is stored (blank for an unset field, 1.50 for 1.5).
export function scalarToSave(field: TaskField, stored: TaskFieldValue | undefined, typed: string): TaskFieldValue | null | undefined {
  const before = scalarToDraft(field, stored)
  if (typed === before) return undefined
  const next = draftToScalar(field, typed)
  return next === draftToScalar(field, before) ? undefined : next
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
    case 'text':
    case 'integer':
    case 'number':
    case 'date': {
      const value = valueOf(task, field)
      return value === undefined || value === '' ? null : String(value)
    }
    case 'datetime': {
      const text = scalarToDraft(field, valueOf(task, field))
      return text ? `${text.replace('T', ' ')} UTC` : null
    }
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
