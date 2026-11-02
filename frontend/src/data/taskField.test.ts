import type { Task, TaskField } from '@/types'
import {
  addTags, choiceOf, displayValue, draftToScalar, fieldSummaries, fieldTitle, hasVoted, isChecked, isScalarType, nextRating,
  parseOptions, ratingOf, removeTag, scalarDraftError, scalarInput, scalarToDraft, scalarToSave, spokenValue, tagsOf, tidyLabels,
  validateFieldDraft, votersOf, withFieldValues, TASK_FIELD_TYPES,
} from './taskField'

const field = (id: number, field_type: TaskField['field_type'], options: string[] = []): TaskField => ({ id, name: `F${id}`, field_type, options })
const tags = field(1, 'tags')
const stage = field(2, 'dropdown', ['Draft', 'Final'])
const reviewed = field(3, 'checkbox')
const stars = field(4, 'rating')
const votes = field(5, 'vote')
const task = (field_values?: Task['field_values']) => ({ id: 7, field_values }) as unknown as Task

test('tidyLabels trims and drops blanks and repeats ignoring case', () => {
  expect(tidyLabels([' api ', 'API', '', 'ui', '  '])).toEqual(['api', 'ui'])
})

test('parseOptions splits on lines or commas', () => {
  expect(parseOptions('Draft\nFinal, Shipped\n\ndraft')).toEqual(['Draft', 'Final', 'Shipped'])
})

test('addTags splits commas, skips repeats and stops at the limit', () => {
  expect(addTags(['api'], 'ui, API, docs')).toEqual(['api', 'ui', 'docs'])
  const many = Array.from({ length: 20 }, (_, n) => `t${n}`)
  expect(addTags(many, 'extra')).toHaveLength(20)
})

test('removeTag drops one tag', () => {
  expect(removeTag(['a', 'b'], 'a')).toEqual(['b'])
})

test('validateFieldDraft names the first problem', () => {
  expect(validateFieldDraft({ name: '  ', field_type: 'rating', options: [] })).toBe('Give the field a name.')
  expect(validateFieldDraft({ name: 'x'.repeat(101), field_type: 'rating', options: [] })).toMatch(/at most 100/)
  expect(validateFieldDraft({ name: 'priority', field_type: 'rating', options: [] }, ['Priority'])).toMatch(/already a field/)
  expect(validateFieldDraft({ name: 'Stage', field_type: 'dropdown', options: [' ', ''] })).toBe('Add at least one choice.')
  expect(validateFieldDraft({ name: 'Stage', field_type: 'dropdown', options: ['x'.repeat(41)] })).toMatch(/at most 40/)
  expect(validateFieldDraft({ name: 'Stage', field_type: 'dropdown', options: Array.from({ length: 31 }, (_, n) => `c${n}`) })).toMatch(/at most 30/)
  expect(validateFieldDraft({ name: 'Stage', field_type: 'dropdown', options: ['Draft'] })).toBeNull()
  expect(validateFieldDraft({ name: 'Reviewed', field_type: 'checkbox', options: [] })).toBeNull()
})

test('values are read by field id and fall back to empty', () => {
  const t = task({ '1': ['api', 'ui'], '2': 'Final', '3': true, '4': 3, '5': [10, 11] })
  expect(tagsOf(t, tags)).toEqual(['api', 'ui'])
  expect(choiceOf(t, stage)).toBe('Final')
  expect(isChecked(t, reviewed)).toBe(true)
  expect(ratingOf(t, stars)).toBe(3)
  expect(votersOf(t, votes)).toEqual([10, 11])

  const empty = task()
  expect(tagsOf(empty, tags)).toEqual([])
  expect(choiceOf(empty, stage)).toBe('')
  expect(isChecked(empty, reviewed)).toBe(false)
  expect(ratingOf(empty, stars)).toBe(0)
  expect(votersOf(empty, votes)).toEqual([])
})

test('a dropdown value that is no longer a choice reads as empty', () => {
  expect(choiceOf(task({ '2': 'Retired' }), stage)).toBe('')
})

test('hasVoted looks for the signed-in user', () => {
  expect(hasVoted([1, 2], 2)).toBe(true)
  expect(hasVoted([1, 2], 3)).toBe(false)
  expect(hasVoted([1, 2], null)).toBe(false)
})

test('clicking the current star clears the rating', () => {
  expect(nextRating(0, 4)).toBe(4)
  expect(nextRating(2, 4)).toBe(4)
  expect(nextRating(4, 4)).toBeNull()
})

test('displayValue shows only values that exist', () => {
  const t = task({ '1': ['api', 'ui'], '2': 'Final', '3': true, '4': 3, '5': [10] })
  expect(displayValue(t, tags)).toBe('api, ui')
  expect(displayValue(t, stage)).toBe('Final')
  expect(displayValue(t, reviewed)).toBe('Yes')
  expect(displayValue(t, stars)).toBe('★★★☆☆')
  expect(displayValue(t, votes)).toBe('1 vote')
  expect(displayValue(task({ '5': [1, 2] }), votes)).toBe('2 votes')
  for (const f of [tags, stage, reviewed, stars, votes]) expect(displayValue(task(), f)).toBeNull()
})

test('ratings are spoken as words', () => {
  expect(spokenValue(task({ '4': 3 }), stars)).toBe('3 of 5 stars')
  expect(spokenValue(task({ '2': 'Final' }), stage)).toBe('Final')
})

test('fieldSummaries lists the fields with a value, in field order', () => {
  const t = task({ '4': 5, '2': 'Draft' })
  expect(fieldSummaries([tags, stage, reviewed, stars, votes], t).map((s) => s.field.id)).toEqual([2, 4])
  expect(fieldSummaries([stars], t)[0]).toMatchObject({ text: '★★★★★', spoken: '5 of 5 stars' })
})

test('withFieldValues replaces one task\'s values and leaves the rest', () => {
  const tasks = [{ id: 7, title: 'A' }, { id: 8, title: 'B', field_values: { '1': ['x'] } }] as unknown as Task[]
  const next = withFieldValues(tasks, 7, { '4': 2 })
  expect(next[0].field_values).toEqual({ '4': 2 })
  expect(next[1]).toBe(tasks[1])
})

describe('text, number and date fields', () => {
  const named = (id: number, name: string, field_type: TaskField['field_type']): TaskField => ({ id, name, field_type, options: [] })
  const note = named(11, 'Note', 'text')
  const estimate = named(12, 'Estimate', 'integer')
  const cost = named(13, 'Cost', 'number')
  const shipped = named(14, 'Shipped', 'date')
  const due = named(15, 'Review by', 'datetime')

  test('the type picker lists the scalar kinds, which match the backend and leave yes/no to the checkbox', () => {
    const types = TASK_FIELD_TYPES.map((t) => t.type)
    expect(types).toEqual(['text', 'integer', 'number', 'date', 'datetime', 'tags', 'dropdown', 'checkbox', 'rating', 'vote'])
    expect(types).not.toContain('boolean')
    expect(types.filter(isScalarType)).toEqual(['text', 'integer', 'number', 'date', 'datetime'])
    expect(isScalarType('rating')).toBe(false)
  })

  test('each scalar kind is edited with the matching box', () => {
    expect(scalarInput('text')).toEqual({ input: 'text', step: undefined })
    expect(scalarInput('integer')).toEqual({ input: 'number', step: '1' })
    expect(scalarInput('number')).toEqual({ input: 'number', step: 'any' })
    expect(scalarInput('date').input).toBe('date')
    expect(scalarInput('datetime').input).toBe('datetime-local')
  })

  test('stored values are shown in the box, with zero kept', () => {
    expect(scalarToDraft(estimate, 0)).toBe('0')
    expect(scalarToDraft(note, undefined)).toBe('')
    expect(scalarToDraft(note, '')).toBe('')
    expect(scalarToDraft(cost, 1.5)).toBe('1.5')
    expect(scalarToDraft(due, '2026-10-04T12:30:00+02:00')).toBe('2026-10-04T10:30')
    expect(scalarToDraft(due, 'garbage')).toBe('')
  })

  test('the text in the box becomes the value to store, or null when empty', () => {
    expect(draftToScalar(estimate, '7')).toBe(7)
    expect(draftToScalar(estimate, '0')).toBe(0)
    expect(draftToScalar(cost, '1.5')).toBe(1.5)
    expect(draftToScalar(shipped, ' 2026-10-04 ')).toBe('2026-10-04')
    expect(draftToScalar(due, '2026-10-04T10:30')).toBe('2026-10-04T10:30:00Z')
    expect(draftToScalar(due, '2026-10-04T10:30:15')).toBe('2026-10-04T10:30:15Z')
    expect(draftToScalar(note, 'hello ')).toBe('hello ')
    expect(draftToScalar(note, '   ')).toBeNull()
    expect(draftToScalar(estimate, '')).toBeNull()
  })

  test('text that does not fit is named in the error', () => {
    expect(scalarDraftError(estimate, '1.5')).toBe('Estimate must be a whole number')
    expect(scalarDraftError(estimate, '-3')).toBeNull()
    expect(scalarDraftError(cost, 'abc')).toBe('Cost must be a number')
    expect(scalarDraftError(cost, '0x10')).toBe('Cost must be a number')
    expect(scalarDraftError(cost, '1e3')).toBeNull()
    expect(scalarDraftError(shipped, '2026-02-30')).toBe('Shipped must be a date (YYYY-MM-DD)')
    expect(scalarDraftError(shipped, '2026-02-28')).toBeNull()
    expect(scalarDraftError(due, '2026-10-04')).toBe('Review by must be a date and time')
    expect(scalarDraftError(due, '2026-10-04T10:30')).toBeNull()
    expect(scalarDraftError(note, 'anything')).toBeNull()
    expect(scalarDraftError(estimate, '')).toBeNull()
    expect(scalarDraftError(stars, 'x')).toBeNull()
  })

  test('only a real change is saved, and an emptied box clears the value', () => {
    expect(scalarToSave(estimate, 3, '3')).toBeUndefined()
    expect(scalarToSave(estimate, 3, '4')).toBe(4)
    expect(scalarToSave(estimate, 3, '')).toBeNull()
    expect(scalarToSave(estimate, 3, '0')).toBe(0)
    expect(scalarToSave(note, undefined, '   ')).toBeUndefined()
    expect(scalarToSave(note, undefined, 'hi')).toBe('hi')
    expect(scalarToSave(cost, 1.5, '1.50')).toBeUndefined()
    expect(scalarToSave(due, '2026-10-04T12:30:00+02:00', '2026-10-04T10:30')).toBeUndefined()
    expect(scalarToSave(due, '2026-10-04T12:30:00+02:00', '2026-10-05T10:30')).toBe('2026-10-05T10:30:00Z')
  })

  test('values are shown as text, a date and time in UTC, and nothing when unset', () => {
    const shown = [note, estimate, cost, shipped, due]
    const t = task({ '11': 'hello', '12': 0, '13': 1.5, '14': '2026-10-04', '15': '2026-10-04T10:30:00Z' })
    expect(shown.map((f) => displayValue(t, f))).toEqual(['hello', '0', '1.5', '2026-10-04', '2026-10-04 10:30 UTC'])
    expect(fieldSummaries(shown, t).map((s) => s.spoken)).toEqual(['hello', '0', '1.5', '2026-10-04', '2026-10-04 10:30 UTC'])
    for (const f of shown) expect(displayValue(task(), f)).toBeNull()
    expect(displayValue(task({ '11': '' }), note)).toBeNull()
  })

  test('a date and time says its zone in the edit dialog', () => {
    expect(fieldTitle(due)).toBe('Review by (UTC)')
    expect(fieldTitle(note)).toBe('Note')
  })
})
