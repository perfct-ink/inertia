import type { CustomFieldValue, Task, TaskField, TaskFieldType } from '@/types'

// The custom field types and the pure rules for editing their values. Mirrors
// TaskField / FieldValue in the backend (backend/app/models/task_field.rb): the
// scalar Collection field types, so a value that passes here passes there.
interface TaskFieldTypeInfo {
  label: string
  // The control that edits it ('select' is the yes/no choice).
  input: 'text' | 'number' | 'date' | 'datetime-local' | 'select'
  step?: string
  // Completes "<field name> must be ..." when a value doesn't fit.
  expected: string
}

export const TASK_FIELD_TYPES: Record<TaskFieldType, TaskFieldTypeInfo> = {
  text: { label: 'Text', input: 'text', expected: 'text' },
  integer: { label: 'Whole number', input: 'number', step: '1', expected: 'a whole number' },
  number: { label: 'Number', input: 'number', step: 'any', expected: 'a number' },
  boolean: { label: 'Yes / no', input: 'select', expected: 'yes or no' },
  date: { label: 'Date', input: 'date', expected: 'a date (YYYY-MM-DD)' },
  datetime: { label: 'Date and time (UTC)', input: 'datetime-local', expected: 'a date and time' },
}

export const TASK_FIELD_TYPE_LIST = Object.keys(TASK_FIELD_TYPES) as TaskFieldType[]

// TaskField::MAX_PER_WORKSPACE.
export const MAX_TASK_FIELDS = 30

// What the edit controls hold, by field id: the raw text of each input ('' when unset).
export type FieldDraft = Record<string, string>
// What a save sends: field id to the new value, or null to clear it.
export type CustomFieldChanges = Record<string, CustomFieldValue | null>

const INTEGER = /^-?\d+$/
const NUMBER = /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i
const DATE = /^\d{4}-\d{2}-\d{2}$/
const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/

function isRealDate(text: string): boolean {
  const date = new Date(`${text}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text
}

function isUnset(value: CustomFieldValue | null | undefined): value is null | undefined | '' {
  return value === null || value === undefined || value === ''
}

// A stored value as the edit control shows it. Date and times are shown in UTC.
export function valueToDraft(field: TaskField, value: CustomFieldValue | null | undefined): string {
  if (isUnset(value)) return ''
  if (field.data_type === 'datetime') {
    const date = new Date(String(value))
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 16)
  }
  return String(value)
}

// What the edit control holds as the value to store, or null when it is empty.
// Call fieldDraftError first: this assumes the text is valid.
export function draftToValue(field: TaskField, raw: string): CustomFieldValue | null {
  const text = raw.trim()
  if (text === '') return null
  switch (field.data_type) {
    case 'text': return raw
    case 'integer':
    case 'number': return Number(text)
    case 'boolean': return text === 'true'
    case 'datetime': return text.length === 16 ? `${text}:00Z` : `${text}Z`
    default: return text
  }
}

// Why the text can't be stored in this field, or null if it can (or is empty).
export function fieldDraftError(field: TaskField, raw: string): string | null {
  const text = raw.trim()
  if (text === '') return null
  const fits: Record<TaskFieldType, boolean> = {
    text: true,
    integer: INTEGER.test(text) && Number.isSafeInteger(Number(text)),
    number: NUMBER.test(text) && Number.isFinite(Number(text)),
    boolean: text === 'true' || text === 'false',
    date: DATE.test(text) && isRealDate(text),
    datetime: DATETIME_LOCAL.test(text) && isRealDate(text.slice(0, 10)),
  }
  return fits[field.data_type] ? null : `${field.name} must be ${TASK_FIELD_TYPES[field.data_type].expected}`
}

// The first thing wrong with the whole form, or null.
export function draftError(fields: TaskField[], draft: FieldDraft): string | null {
  for (const field of fields) {
    const error = fieldDraftError(field, draft[String(field.id)] ?? '')
    if (error) return error
  }
  return null
}

// The edit form's starting point: every field with the task's current value.
export function draftFromTask(fields: TaskField[], task: Pick<Task, 'custom_fields'>): FieldDraft {
  return Object.fromEntries(fields.map((field) => [String(field.id), valueToDraft(field, task.custom_fields?.[String(field.id)])]))
}

// Only the fields whose value the user actually changed, ready to send.
export function draftChanges(fields: TaskField[], task: Pick<Task, 'custom_fields'>, draft: FieldDraft): CustomFieldChanges {
  const changes: CustomFieldChanges = {}
  for (const field of fields) {
    const id = String(field.id)
    if (!(id in draft)) continue
    const before = valueToDraft(field, task.custom_fields?.[id])
    if (draft[id] === before) continue
    const next = draftToValue(field, draft[id])
    if (next !== draftToValue(field, before)) changes[id] = next
  }
  return changes
}

// A value as read-only text ("Yes", "2026-10-04 10:30 UTC").
export function formatFieldValue(field: TaskField, value: CustomFieldValue): string {
  if (field.data_type === 'boolean') return value === true || value === 'true' ? 'Yes' : 'No'
  if (field.data_type === 'datetime') {
    const text = valueToDraft(field, value)
    return text ? `${text.replace('T', ' ')} UTC` : String(value)
  }
  return String(value)
}

// The fields a task has a value for, in field order, with the value as text.
// Values of fields that no longer exist are ignored.
export function visibleFieldValues(fields: TaskField[], task: Pick<Task, 'custom_fields'>): { field: TaskField; text: string }[] {
  return fields.flatMap((field) => {
    const value = task.custom_fields?.[String(field.id)]
    return isUnset(value) ? [] : [{ field, text: formatFieldValue(field, value) }]
  })
}

// Field names are unique per Space, ignoring case and surrounding spaces.
export function isDuplicateFieldName(name: string, fields: TaskField[], exceptId?: number): boolean {
  const wanted = name.trim().toLowerCase()
  return fields.some((field) => field.id !== exceptId && field.name.trim().toLowerCase() === wanted)
}
