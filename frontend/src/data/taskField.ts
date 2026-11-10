import type { Task, TaskField, TaskFieldKind, TaskFieldType, TaskFieldValue, TaskFieldValues } from '@/types'
import type { CellValue, FieldDataType, TableField } from '@/api/tables'
import { FIELD_TYPES, choicesProblem, displayValue as cellText, type DisplayContext } from './fieldType'
import { checkFormula, computeFormulas, formatResult, type FormulaField, type FormulaResult, type RecordValues } from './formula'
import { parseExpression, referencesIn } from '@/util/expression'

// Mirrors TaskFieldType in backend/app/models/task_field_type.rb: what each
// kind of custom task field stores and accepts, plus the display helpers.
// Besides the five task kinds, a field can be any Collection type that holds a
// value of its own, a person, or a formula; those reuse data/fieldType.ts and
// data/formula.ts, so a type works the same on a task as in a Collection.

export interface TaskFieldTypeInfo { type: TaskFieldType; label: string; hint: string; group: 'task' | 'collection' }

const TASK_KINDS: TaskFieldTypeInfo[] = [
  { type: 'tags', label: 'Tags', hint: 'Short labels you type in, different on every task.', group: 'task' },
  { type: 'dropdown', label: 'Dropdown', hint: 'One choice from a list you set.', group: 'task' },
  { type: 'checkbox', label: 'Checkbox', hint: 'Yes or no.', group: 'task' },
  { type: 'rating', label: 'Rating', hint: 'One to five stars.', group: 'task' },
  { type: 'vote', label: 'Vote', hint: 'Each member can vote once.', group: 'task' },
]

const KIND_NAMES = TASK_KINDS.map((k) => k.type as string)

// The Collection types a task can use: every type that holds a value of its own, a
// person, and a formula (TaskFieldType::COLLECTION_TYPES on the server). Written
// out because data/fieldType.ts imports this file; a test checks it against FIELD_TYPES.
export const COLLECTION_TASK_TYPES: TaskFieldType[] = [
  'text', 'long_text', 'integer', 'number', 'boolean', 'date', 'datetime',
  'email', 'phone', 'url', 'username', 'person_name', 'alphanumeric', 'color',
  'money', 'mileage', 'percent', 'month', 'year', 'single_select', 'multi_select',
  'person', 'formula',
]

// Every type a task field can have, in the order the type picker lists them.
export function taskFieldTypes(): TaskFieldTypeInfo[] {
  return [
    ...TASK_KINDS,
    ...COLLECTION_TASK_TYPES.map((type) => {
      const info = FIELD_TYPES[type as FieldDataType]
      return { type, label: info.label, hint: info.hint ?? '', group: 'collection' as const }
    }),
  ]
}

export const isTaskKind = (type: TaskFieldType): type is TaskFieldKind => KIND_NAMES.includes(type)
export const isCollectionType = (type: TaskFieldType): boolean => !isTaskKind(type)
export const hasTaskChoices = (type: TaskFieldType): boolean => type === 'dropdown' || type === 'single_select' || type === 'multi_select'

// A Collection-typed task field as the Collection helpers and FieldCell expect it.
export function asTableField(field: TaskField): TableField {
  return {
    id: field.id, name: field.name, data_type: field.field_type as FieldDataType, relation_table_id: null,
    display_format: field.display_format ?? null, options: field.options, formula: field.formula ?? null,
  }
}

export const RATING_MAX = 5
export const MAX_TAGS = 20
export const MAX_LABEL_LENGTH = 40
export const MAX_OPTIONS = 30
export const MAX_NAME_LENGTH = 100

export function typeLabel(type: TaskFieldType): string {
  return taskFieldTypes().find((t) => t.type === type)?.label ?? type
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
  formula?: string | null
}

// The first problem with a field about to be saved, or null when it is fine.
// `otherNames` are the Space's other fields (names are unique ignoring case);
// `otherFields` are what a formula may refer to.
export function validateFieldDraft(draft: FieldDraft, otherNames: string[] = [], otherFields: TaskField[] = []): string | null {
  const name = draft.name.trim()
  if (!name) return 'Give the field a name.'
  if (name.length > MAX_NAME_LENGTH) return `Field names are at most ${MAX_NAME_LENGTH} characters.`
  if (otherNames.some((other) => other.trim().toLowerCase() === name.toLowerCase())) return `There is already a field called ${name}.`
  if (draft.field_type === 'single_select' || draft.field_type === 'multi_select') {
    const problem = choicesProblem(tidyLabels(draft.options))
    if (problem) return problem
  }
  if (draft.field_type === 'formula') {
    const formula = (draft.formula ?? '').trim()
    if (!formula) return 'Write the formula.'
    const problem = checkFormula(name, formula, formulaFields(otherFields))
    if (problem) return `${problem}.`
  }
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

// Whether a formula reads anything this task has a value for. A row shows no chip
// for a formula with nothing to work from ("{Cost} * 2" on a task with no Cost),
// so a new formula field doesn't put "0" on every task.
function formulaHasInput(field: TaskField, fields: TaskField[], task: FormulaTask, seen: Set<number> = new Set()): boolean {
  let names: string[]
  try {
    names = referencesIn(parseExpression(field.formula ?? ''))
  } catch {
    return true
  }
  if (names.length === 0) return true
  seen.add(field.id)
  return names.some((name) => {
    const custom = fields.find((f) => f.name === name)
    if (custom) {
      if (custom.field_type === 'formula') return !seen.has(custom.id) && formulaHasInput(custom, fields, task, seen)
      return task.field_values?.[String(custom.id)] !== undefined
    }
    const builtIn = BUILT_IN_FORMULA_FIELDS.find((f) => f.name === name)
    return builtIn ? builtIn.read(task) !== null : true
  })
}

// ── Formulas ─────────────────────────────────────────────────────────────────

// The task's own fields a formula can name, besides the custom ones.
// Their ids are negative so they never meet a custom field's.
type Value = RecordValues[string]
export const BUILT_IN_FORMULA_FIELDS: { id: number; name: string; read: (task: FormulaTask, people?: ReadonlyMap<number, string>) => Value }[] = [
  { id: -1, name: 'Title', read: (task) => task.title ?? null },
  { id: -2, name: 'Status', read: (task) => task.status ?? null },
  { id: -3, name: 'Due date', read: (task) => task.due_date ?? null },
  { id: -4, name: 'Start date', read: (task) => task.start_date ?? null },
  // The assignee's name when the members are loaded, else their user id.
  { id: -5, name: 'Assignee', read: (task, people) => (task.assignee_id ? people?.get(task.assignee_id) ?? task.assignee_id : null) },
]

type FormulaTask = Partial<Pick<Task, 'title' | 'status' | 'due_date' | 'start_date' | 'assignee_id'>> & Pick<Task, 'field_values'>

// The fields a formula can refer to, by name: the built-in ones, then the custom ones
// (a custom field with a built-in's name wins).
function formulaFields(fields: TaskField[]): FormulaField[] {
  return [
    ...BUILT_IN_FORMULA_FIELDS.map(({ id, name }) => ({ id, name, data_type: 'text' })),
    ...fields.map((field) => ({ id: field.id, name: field.name, data_type: field.field_type as string, formula: field.formula ?? null })),
  ]
}

// Each formula field's result for one task, by field id.
export function taskFormulas(fields: TaskField[], task: FormulaTask, people?: ReadonlyMap<number, string>, now: Date = new Date()): Map<number, FormulaResult> {
  if (!fields.some((field) => field.field_type === 'formula')) return new Map()
  const values: RecordValues = {}
  for (const field of BUILT_IN_FORMULA_FIELDS) values[String(field.id)] = field.read(task, people)
  for (const field of fields) {
    const value = task.field_values?.[String(field.id)]
    if (value === undefined) continue
    if (Array.isArray(value)) values[String(field.id)] = field.field_type === 'vote' ? value.length : value.join(', ')
    else if (field.field_type === 'person' && typeof value === 'number') values[String(field.id)] = people?.get(value) ?? value
    else values[String(field.id)] = value
  }
  return computeFormulas(formulaFields(fields), values, now)
}

// ── Showing a value ──────────────────────────────────────────────────────────

// Text for a value, or null when the task has nothing worth showing. A formula's
// result comes from taskFormulas; a person's name from `context.people`.
export function displayValue(task: Pick<Task, 'field_values'>, field: TaskField, context: DisplayContext & { formulas?: Map<number, FormulaResult> } = {}): string | null {
  if (field.field_type === 'formula') {
    const result = context.formulas?.get(field.id)
    if (!result) return null
    const text = formatResult(result)
    return text === '' ? null : text
  }
  if (isCollectionType(field.field_type)) {
    return cellText(asTableField(field), valueOf(task, field) as CellValue | undefined, context) || null
  }
  switch (field.field_type as TaskFieldKind) {
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
export function spokenValue(task: Pick<Task, 'field_values'>, field: TaskField, context: Parameters<typeof displayValue>[2] = {}): string | null {
  if (field.field_type === 'rating') {
    const rating = ratingOf(task, field)
    return rating ? `${rating} of ${RATING_MAX} stars` : null
  }
  return displayValue(task, field, context)
}

export interface FieldSummary {
  field: TaskField
  text: string
  spoken: string
}

// The fields a task has a value for, in field order, for the chips on its row.
export function fieldSummaries(fields: TaskField[], task: FormulaTask, context: DisplayContext = {}): FieldSummary[] {
  const full = { ...context, formulas: taskFormulas(fields, task, context.people) }
  return fields.flatMap((field) => {
    if (field.field_type === 'formula' && !formulaHasInput(field, fields, task)) return []
    const text = displayValue(task, field, full)
    return text ? [{ field, text, spoken: spokenValue(task, field, full) ?? text }] : []
  })
}

// ── Keeping the cached task lists current ────────────────────────────────────

export function withFieldValues(tasks: Task[], taskId: number, fieldValues: TaskFieldValues): Task[] {
  return tasks.map((task) => (task.id === taskId ? { ...task, field_values: fieldValues } : task))
}
