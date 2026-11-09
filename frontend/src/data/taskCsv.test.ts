import type { Task } from '@/types'
import { neutralizeRows, toCsv } from '@/util/csv'
import { DEFAULT_BOARD_STATUSES, resolveStatuses } from '@/data/task_status'
import { TASK_EXPORT_HEADERS, tasksToRows } from './taskCsv'

function task(overrides: Partial<Task>): Task {
  return { id: 1, title: 'Write docs', description: null, status: 'todo', due_date: null, position: 0, document_id: 5, assignee_id: null, epic_id: null, parent_id: null, folder_id: null, ...overrides }
}

const lookups = {
  statuses: DEFAULT_BOARD_STATUSES,
  epics: [{ id: 2, title: 'Launch' }],
  sprints: [{ id: 3, title: 'Sprint 4' }],
  milestones: [{ id: 4, title: 'Beta' }],
  members: [
    { user_id: 11, user: { id: 11, name: 'Ada Lovelace', email: 'ada@example.com' } },
    { user_id: 12, user: { id: 12, name: 'Bo Diddley', email: 'bo@example.com' } },
  ],
}

describe('tasksToRows', () => {
  it('starts with the header row', () => {
    expect(tasksToRows([], lookups)).toEqual([TASK_EXPORT_HEADERS])
  })

  it('writes labels, dates, people and the titles of the epic, sprint, milestone and document', () => {
    const rows = tasksToRows([
      task({
        id: 7, title: 'Ship it', kind: 'bug', status: 'in_progress', priority: 'high', assignee_ids: [12, 11], start_date: '2026-11-01', due_date: '2026-11-09',
        epic_id: 2, sprint_id: 3, milestone_id: 4, estimate_hours: 6.5, story_points: 3, description: 'Final pass', document: { id: 5, title: 'Plan' } as Task['document'],
      }),
    ], lookups)
    expect(rows[1]).toEqual([7, 'Ship it', 'Bug', 'In Progress', 'High', 'Bo Diddley; Ada Lovelace', '2026-11-01', '2026-11-09', 'Launch', 'Sprint 4', 'Beta', 'Plan', 6.5, 3, 'Final pass'])
  })

  it('uses the status names set on the board', () => {
    const renamed = { ...lookups, statuses: resolveStatuses([{ id: 1, status: 'todo', label: 'Ready', color: null, folder_id: null }], []) }
    expect(tasksToRows([task({ status: 'todo' })], renamed)[1][3]).toBe('Ready')
  })

  it('leaves blanks for missing values, unknown ids and unknown people', () => {
    const rows = tasksToRows([task({ epic_id: 99, sprint_id: null, assignee_ids: [99] })], lookups)
    expect(rows[1]).toEqual([1, 'Write docs', 'Task', 'To Do', '', '', '', '', '', '', '', '', '', '', ''])
  })

  it('serialises with quoting for commas and quotes, and keeps formulas from running', () => {
    const rows = tasksToRows([task({ title: 'Plan, then "do"', description: '=HYPERLINK("http://x")' })], lookups)
    const lines = toCsv(neutralizeRows(rows)).split('\r\n')
    expect(lines[1]).toBe('1,"Plan, then ""do""",Task,To Do,,,,,,,,,,,"\'=HYPERLINK(""http://x"")"')
  })
})
