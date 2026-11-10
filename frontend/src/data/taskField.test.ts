import type { Task, TaskField } from '@/types'
import {
  addTags, choiceOf, displayValue, fieldSummaries, hasVoted, isChecked, nextRating, parseOptions, ratingOf,
  removeTag, spokenValue, tagsOf, tidyLabels, validateFieldDraft, votersOf, withFieldValues,
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

// ── Collection field types on tasks (custom-fields-on-tasks) ──────────────────

import { FIELD_TYPES } from './fieldType'
import { COLLECTION_TASK_TYPES, isCollectionType, taskFieldTypes, taskFormulas } from './taskField'

const typed = (id: number, name: string, field_type: TaskField['field_type'], extra: Partial<TaskField> = {}): TaskField =>
  ({ id, name, field_type, options: [], ...extra })

test('a task can use every Collection type that holds a value, a person and a formula, and rating stays the task kind', () => {
  const expected = Object.entries(FIELD_TYPES)
    .filter(([type, info]) => (info.kind === 'value' || type === 'person' || type === 'formula') && type !== 'rating')
    .map(([type]) => type)
  expect([...COLLECTION_TASK_TYPES].sort()).toEqual(expected.sort())
  expect(taskFieldTypes().filter((t) => t.type === 'rating')).toHaveLength(1)
  expect(isCollectionType('money')).toBe(true)
  expect(isCollectionType('tags')).toBe(false)
})

test('a Collection-typed value shows in its format, and a person by name', () => {
  const t = { field_values: { '1': 1250, '2': 7, '3': ['Bug', 'Docs'] } } as unknown as Task
  expect(displayValue(t, typed(1, 'Cost', 'money', { display_format: 'eur' }))).toBe('€1,250.00')
  expect(displayValue(t, typed(2, 'Reviewer', 'person'), { people: new Map([[7, 'Ada']]) })).toBe('Ada')
  expect(displayValue(t, typed(3, 'Labels', 'multi_select', { options: ['Bug', 'Docs'] }))).toBe('Bug, Docs')
  expect(displayValue({ field_values: {} } as unknown as Task, typed(1, 'Cost', 'money'))).toBeNull()
})

test('a formula reads the task\'s own fields and the custom ones, and shows on the row', () => {
  const fields = [
    typed(1, 'Estimate', 'number'),
    typed(2, 'Double', 'formula', { formula: '{Estimate} * 2' }),
    typed(3, 'Left', 'formula', { formula: 'DAYS({Due date}, "2026-11-10")' }),
    typed(4, 'Who', 'formula', { formula: '{Assignee} & " on " & {Title}' }),
  ]
  const t = { title: 'Ship it', due_date: '2026-11-15', assignee_id: 7, field_values: { '1': 4 } } as unknown as Task
  const results = taskFormulas(fields, t, new Map([[7, 'Ada']]))
  expect(results.get(2)).toEqual({ value: 8 })
  expect(results.get(3)).toEqual({ value: 5 })
  expect(results.get(4)).toEqual({ value: 'Ada on Ship it' })
  expect(fieldSummaries(fields, t, { people: new Map([[7, 'Ada']]) }).map((s) => [s.field.name, s.text])).toEqual([
    ['Estimate', '4'], ['Double', '8'], ['Left', '5'], ['Who', 'Ada on Ship it'],
  ])
})

test('a broken formula shows its error, not a crash', () => {
  const fields = [typed(1, 'Bad', 'formula', { formula: '{Nope} + 1' })]
  expect(displayValue({ field_values: {} } as unknown as Task, fields[0], { formulas: taskFormulas(fields, { field_values: {} } as unknown as Task) })).toBe('#REF!')
})

test('drafts of select and formula fields are checked before saving', () => {
  expect(validateFieldDraft({ name: 'Stage', field_type: 'single_select', options: [] })).toMatch(/choice/i)
  expect(validateFieldDraft({ name: 'Stage', field_type: 'single_select', options: ['Open'] })).toBeNull()
  expect(validateFieldDraft({ name: 'Late', field_type: 'formula', options: [] })).toBe('Write the formula.')
  expect(validateFieldDraft({ name: 'Late', field_type: 'formula', options: [], formula: '{Late} + 1' })).not.toBeNull()
  expect(validateFieldDraft({ name: 'Late', field_type: 'formula', options: [], formula: 'DAYS({Due date}, TODAY())' })).toBeNull()
})

test('a row shows no chip for a formula with nothing to work from', () => {
  const fields = [typed(1, 'Cost', 'money'), typed(2, 'Double cost', 'formula', { formula: '{Cost} * 2' }), typed(3, 'Now', 'formula', { formula: 'TODAY()' })]
  expect(fieldSummaries(fields, { field_values: {} } as unknown as Task).map((s) => s.field.name)).toEqual(['Now'])
  expect(fieldSummaries(fields, { field_values: { '1': 5 } } as unknown as Task).map((s) => s.field.name)).toEqual(['Cost', 'Double cost', 'Now'])
})
