import type { Task, TaskField } from '@/types'
import {
  draftChanges, draftError, draftFromTask, draftToValue, fieldDraftError, formatFieldValue, isDuplicateFieldName,
  valueToDraft, visibleFieldValues, TASK_FIELD_TYPES, TASK_FIELD_TYPE_LIST,
} from './taskField'

const field = (id: number, name: string, data_type: TaskField['data_type']): TaskField => ({ id, name, data_type })
const estimate = field(1, 'Estimate', 'integer')
const reviewed = field(2, 'Reviewed', 'boolean')
const note = field(3, 'Note', 'text')
const due = field(4, 'Review by', 'datetime')
const cost = field(5, 'Cost', 'number')
const shipped = field(6, 'Shipped', 'date')
const fields = [estimate, reviewed, note, due, cost, shipped]
const task = (custom_fields?: Task['custom_fields']) => ({ custom_fields }) as Pick<Task, 'custom_fields'>

test('the types are the scalar Collection field types', () => {
  expect(TASK_FIELD_TYPE_LIST).toEqual(['text', 'integer', 'number', 'boolean', 'date', 'datetime'])
  expect(TASK_FIELD_TYPES.boolean.input).toBe('select')
})

test('stored values are shown in the edit controls, with false and 0 kept', () => {
  expect(valueToDraft(estimate, 0)).toBe('0')
  expect(valueToDraft(reviewed, false)).toBe('false')
  expect(valueToDraft(note, undefined)).toBe('')
  expect(valueToDraft(note, null)).toBe('')
  expect(valueToDraft(due, '2026-10-04T12:30:00+02:00')).toBe('2026-10-04T10:30')
  expect(valueToDraft(due, 'garbage')).toBe('')
})

test('control text becomes the value to store, or null when empty', () => {
  expect(draftToValue(estimate, '7')).toBe(7)
  expect(draftToValue(estimate, '0')).toBe(0)
  expect(draftToValue(cost, '1.5')).toBe(1.5)
  expect(draftToValue(reviewed, 'false')).toBe(false)
  expect(draftToValue(reviewed, 'true')).toBe(true)
  expect(draftToValue(due, '2026-10-04T10:30')).toBe('2026-10-04T10:30:00Z')
  expect(draftToValue(due, '2026-10-04T10:30:15')).toBe('2026-10-04T10:30:15Z')
  expect(draftToValue(shipped, '2026-10-04')).toBe('2026-10-04')
  expect(draftToValue(note, 'hello ')).toBe('hello ')
  expect(draftToValue(note, '   ')).toBeNull()
  expect(draftToValue(estimate, '')).toBeNull()
})

test('values that do not fit the type are named in the error', () => {
  expect(fieldDraftError(estimate, '1.5')).toBe('Estimate must be a whole number')
  expect(fieldDraftError(estimate, '-3')).toBeNull()
  expect(fieldDraftError(cost, 'abc')).toBe('Cost must be a number')
  expect(fieldDraftError(cost, '0x10')).toBe('Cost must be a number')
  expect(fieldDraftError(cost, '1e3')).toBeNull()
  expect(fieldDraftError(shipped, '2026-02-30')).toBe('Shipped must be a date (YYYY-MM-DD)')
  expect(fieldDraftError(shipped, '2026-02-28')).toBeNull()
  expect(fieldDraftError(due, '2026-10-04')).toBe('Review by must be a date and time')
  expect(fieldDraftError(due, '2026-10-04T10:30')).toBeNull()
  expect(fieldDraftError(reviewed, 'maybe')).toBe('Reviewed must be yes or no')
  expect(fieldDraftError(note, 'anything')).toBeNull()
  expect(fieldDraftError(estimate, '')).toBeNull()
  expect(draftError(fields, { 1: '2', 5: 'x' })).toBe('Cost must be a number')
  expect(draftError(fields, { 1: '2' })).toBeNull()
})

test('the edit form starts from the task and only sends what changed', () => {
  const t = task({ 1: 3, 2: false, 4: '2026-10-04T12:30:00+02:00' })
  const draft = draftFromTask(fields, t)
  expect(draft).toEqual({ 1: '3', 2: 'false', 3: '', 4: '2026-10-04T10:30', 5: '', 6: '' })
  expect(draftChanges(fields, t, draft)).toEqual({})

  expect(draftChanges(fields, t, { ...draft, 1: '4', 3: 'hi', 2: '' })).toEqual({ 1: 4, 3: 'hi', 2: null })
  expect(draftChanges(fields, t, { ...draft, 2: 'true' })).toEqual({ 2: true })
  expect(draftChanges(fields, t, { ...draft, 5: '0' })).toEqual({ 5: 0 })
})

test('typing blanks into an empty field is not a change, and equal numbers are not either', () => {
  const t = task({ 5: 1.5 })
  const draft = draftFromTask(fields, t)
  expect(draftChanges(fields, t, { ...draft, 3: '   ' })).toEqual({})
  expect(draftChanges(fields, t, { ...draft, 5: '1.50' })).toEqual({})
  expect(draftChanges(fields, task(), { 1: '' })).toEqual({})
})

test('read-only text for values', () => {
  expect(formatFieldValue(reviewed, true)).toBe('Yes')
  expect(formatFieldValue(reviewed, false)).toBe('No')
  expect(formatFieldValue(due, '2026-10-04T10:30:00Z')).toBe('2026-10-04 10:30 UTC')
  expect(formatFieldValue(estimate, 0)).toBe('0')
  expect(formatFieldValue(note, 'hello')).toBe('hello')
})

test('a task lists the values it has, in field order, ignoring fields that are gone', () => {
  const t = task({ 3: 'hello', 1: 0, 2: false, 99: 'old' })
  expect(visibleFieldValues(fields, t).map(({ field: f, text }) => [f.name, text])).toEqual([
    ['Estimate', '0'], ['Reviewed', 'No'], ['Note', 'hello'],
  ])
  expect(visibleFieldValues(fields, task())).toEqual([])
  expect(visibleFieldValues(fields, task({ 3: '' }))).toEqual([])
})

test('field names are unique ignoring case and spaces', () => {
  expect(isDuplicateFieldName(' estimate ', fields)).toBe(true)
  expect(isDuplicateFieldName('Estimate', fields, 1)).toBe(false)
  expect(isDuplicateFieldName('Priority', fields)).toBe(false)
})
