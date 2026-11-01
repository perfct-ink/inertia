import type { Task } from '@/types'
import { toCsv } from '@/util/csv'
import { TASK_CSV_HEADERS, tasksToCsvRows } from './taskCsv'

function task(overrides: Partial<Task>): Task {
  return { id: 1, title: 'Write docs', description: null, status: 'todo', due_date: null, position: 0, document_id: 5, assignee_id: null, epic_id: null, parent_id: null, folder_id: null, ...overrides }
}

const lookups = {
  epics: [{ id: 2, title: 'Launch' }],
  sprints: [{ id: 3, title: 'Sprint 4' }],
  milestones: [{ id: 4, title: 'Beta' }],
}

describe('tasksToCsvRows', () => {
  it('starts with the header row', () => {
    expect(tasksToCsvRows([], lookups)).toEqual([TASK_CSV_HEADERS])
  })

  it('writes status labels, dates and the titles of the epic, sprint, milestone and document', () => {
    const rows = tasksToCsvRows([
      task({ id: 7, title: 'Ship it', status: 'in_progress', start_date: '2026-11-01', due_date: '2026-11-09', epic_id: 2, sprint_id: 3, milestone_id: 4, description: 'Final pass', document: { id: 5, title: 'Plan' } as Task['document'] }),
    ], lookups)
    expect(rows[1]).toEqual([7, 'Ship it', 'In Progress', '2026-11-01', '2026-11-09', 'Launch', 'Sprint 4', 'Beta', 'Plan', 'Final pass'])
  })

  it('leaves blanks for missing dates, unknown ids and no document', () => {
    const rows = tasksToCsvRows([task({ epic_id: 99, sprint_id: null })], lookups)
    expect(rows[1]).toEqual([1, 'Write docs', 'To Do', '', '', '', '', '', '', ''])
  })

  it('neutralises titles a spreadsheet would run as formulas', () => {
    const rows = tasksToCsvRows([task({ title: '=HYPERLINK("http://x")', description: '+1' })], lookups)
    expect(rows[1][1]).toBe("'=HYPERLINK(\"http://x\")")
    expect(rows[1][9]).toBe("'+1")
  })

  it('serialises with quoting for commas and quotes', () => {
    const text = toCsv(tasksToCsvRows([task({ title: 'Plan, then "do"' })], lookups))
    expect(text.split('\r\n')[1]).toBe('1,"Plan, then ""do""",To Do,,,,,,,')
  })
})
