import {
  ACTION_COLUMN, DEFAULT_TEMPLATE, RETRO_TEMPLATES, canMakeTask, cardsByColumn, retroSummary, retroTemplate,
  retrospectivePath, suggestedTitle, type RetroCard,
} from './retrospective'

const card = (id: number, column_key: string, votes_count = 0, extra: Partial<RetroCard> = {}): RetroCard => ({
  id, retrospective_id: 1, column_key, body: `Card ${id}`, author_id: null, task_id: null, votes_count, voted: false,
  created_at: '', updated_at: '', ...extra,
})

describe('templates', () => {
  test('lists the four templates with the keys the server accepts', () => {
    expect(RETRO_TEMPLATES.map((t) => t.key)).toEqual(['went_well', 'start_stop_continue', 'four_ls', 'mad_sad_glad'])
    expect(DEFAULT_TEMPLATE).toBe('went_well')
  })

  test('the columns match the server (Retrospective::TEMPLATES)', () => {
    const keys = Object.fromEntries(RETRO_TEMPLATES.map((t) => [t.key, t.columns.map((c) => c.key)]))
    expect(keys).toEqual({
      went_well: ['went_well', 'to_improve', 'action_items'],
      start_stop_continue: ['start', 'stop', 'continue', 'action_items'],
      four_ls: ['liked', 'learned', 'lacked', 'longed_for', 'action_items'],
      mad_sad_glad: ['mad', 'sad', 'glad', 'action_items'],
    })
  })

  test('every template ends with the action items column and has no repeated column', () => {
    for (const template of RETRO_TEMPLATES) {
      const keys = template.columns.map((c) => c.key)
      expect(keys[keys.length - 1]).toBe(ACTION_COLUMN)
      expect(new Set(keys).size).toBe(keys.length)
      expect(template.columns.every((c) => c.label && c.hint)).toBe(true)
    }
  })

  test('an unknown key falls back to the default template', () => {
    expect(retroTemplate('four_ls').label).toBe('4 Ls')
    expect(retroTemplate('whatever').key).toBe('went_well')
  })
})

describe('cardsByColumn', () => {
  const template = retroTemplate('went_well')
  const cards = [card(1, 'to_improve', 1), card(2, 'went_well', 0), card(3, 'went_well', 3), card(4, 'went_well', 3), card(5, 'nope', 9)]

  test('groups cards under the template columns in order, in the order added', () => {
    const grouped = cardsByColumn(template, cards)
    expect(grouped.map((g) => g.column.key)).toEqual(['went_well', 'to_improve', 'action_items'])
    expect(grouped.map((g) => g.cards.map((c) => c.id))).toEqual([[2, 3, 4], [1], []])
  })

  test('with byVotes the most voted come first and ties keep the order added', () => {
    expect(cardsByColumn(template, cards, true)[0].cards.map((c) => c.id)).toEqual([3, 4, 2])
  })

  test('does not reorder the cards it is given', () => {
    const input = [card(2, 'went_well', 0), card(1, 'went_well', 5)]
    cardsByColumn(template, input, true)
    expect(input.map((c) => c.id)).toEqual([2, 1])
  })
})

describe('retroSummary', () => {
  test('says nothing for an empty board and counts cards and tasks otherwise', () => {
    expect(retroSummary({ cards_count: 0, tasks_count: 0 })).toBeNull()
    expect(retroSummary({ cards_count: 1, tasks_count: 0 })).toBe('1 card')
    expect(retroSummary({ cards_count: 5, tasks_count: 1 })).toBe('5 cards, 1 task')
    expect(retroSummary({ cards_count: 5, tasks_count: 2 })).toBe('5 cards, 2 tasks')
  })
})

test('suggestedTitle follows the sprint, else the date', () => {
  expect(suggestedTitle('Sprint 12', '2026-11-02')).toBe('Sprint 12 retrospective')
  expect(suggestedTitle(null, '2026-11-02')).toBe('Retrospective 2026-11-02')
  expect(suggestedTitle(undefined, '2026-11-02')).toBe('Retrospective 2026-11-02')
})

test('only an action item without a task can become one', () => {
  expect(canMakeTask(card(1, 'action_items'))).toBe(true)
  expect(canMakeTask(card(1, 'action_items', 0, { task_id: 7 }))).toBe(false)
  expect(canMakeTask(card(1, 'went_well'))).toBe(false)
})

test('retrospectivePath', () => {
  expect(retrospectivePath(4)).toBe('/retrospectives/4')
})
