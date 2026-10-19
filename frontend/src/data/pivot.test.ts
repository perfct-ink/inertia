import { pivotGroup, pivotTasks, type PivotLookups } from './pivot'
import type { Task } from '@/types'

const lookups: PivotLookups = {
  epics: new Map([[1, 'Onboarding'], [2, 'Billing']]),
  sprints: new Map([[5, 'Sprint 5']]),
  assignees: new Map([[7, 'Sam']]),
}
const task = (id: number, status: string, extra: Partial<Task> = {}) =>
  ({ id, status, epic_id: null, sprint_id: null, assignee_id: null, ...extra }) as unknown as Task

test('groups a task by each dimension, falling back to a none label', () => {
  const t = task(1, 'in_progress', { epic_id: 1, assignee_id: 99 })
  expect(pivotGroup(t, 'status', lookups)).toEqual({ key: 'in_progress', label: 'In Progress' })
  expect(pivotGroup(t, 'epic', lookups)).toEqual({ key: '1', label: 'Onboarding' })
  expect(pivotGroup(t, 'sprint', lookups)).toEqual({ key: 'none', label: 'No sprint' })
  expect(pivotGroup(t, 'assignee', lookups)).toEqual({ key: 'none', label: 'Unassigned' })
})

test('counts tasks per row and column with totals, status in board order and none last', () => {
  const tasks = [
    task(1, 'done', { epic_id: 1 }), task(2, 'todo', { epic_id: 1 }), task(3, 'todo', { epic_id: 2 }),
    task(4, 'todo'), task(5, 'done', { epic_id: 1 }),
  ]
  const table = pivotTasks(tasks, 'epic', 'status', lookups)
  expect(table.rows.map((r) => r.label)).toEqual(['Onboarding', 'Billing', 'No epic'])
  expect(table.columns.map((c) => c.label)).toEqual(['To Do', 'Done'])
  expect(table.counts['1']).toEqual({ done: 2, todo: 1 })
  expect(table.counts.none).toEqual({ todo: 1 })
  expect(table.rowTotals).toEqual({ '1': 3, '2': 1, none: 1 })
  expect(table.columnTotals).toEqual({ done: 2, todo: 3 })
  expect(table.total).toBe(5)
})

test('an empty list gives an empty table', () => {
  const table = pivotTasks([], 'epic', 'status', lookups)
  expect(table.rows).toEqual([])
  expect(table.total).toBe(0)
})
