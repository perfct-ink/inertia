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
