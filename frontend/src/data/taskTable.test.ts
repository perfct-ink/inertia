import { DEFAULT_TASK_TABLE_CONFIG, parseTaskTableConfig, taskTableGroups, visibleColumns, TASK_COLUMNS, type TaskTableOptions } from './taskTable'
import type { PivotLookups } from './pivot'
import type { Task } from '@/types'

const lookups: PivotLookups = { epics: new Map([[1, 'Beta'], [2, 'Alpha']]), sprints: new Map(), assignees: new Map([[7, 'Sam']]) }
const task = (id: number, title: string, extra: Partial<Task> = {}) =>
  ({ id, title, status: 'todo', epic_id: null, sprint_id: null, assignee_id: null, start_date: null, due_date: null, ...extra }) as unknown as Task
const base: TaskTableOptions = { sortKey: 'title', sortDir: 'asc', groupBy: 'none', query: '' }

test('sorts by title either way', () => {
  const tasks = [task(1, 'banana'), task(2, 'Apple'), task(3, 'cherry')]
  expect(taskTableGroups(tasks, base, lookups)[0].tasks.map((t) => t.id)).toEqual([2, 1, 3])
  expect(taskTableGroups(tasks, { ...base, sortDir: 'desc' }, lookups)[0].tasks.map((t) => t.id)).toEqual([3, 1, 2])
})

test('sorts by due date with blanks last whichever way', () => {
  const tasks = [task(1, 'a', { due_date: '2026-11-09' }), task(2, 'b'), task(3, 'c', { due_date: '2026-11-01' })]
  expect(taskTableGroups(tasks, { ...base, sortKey: 'due_date' }, lookups)[0].tasks.map((t) => t.id)).toEqual([3, 1, 2])
  expect(taskTableGroups(tasks, { ...base, sortKey: 'due_date', sortDir: 'desc' }, lookups)[0].tasks.map((t) => t.id)).toEqual([1, 3, 2])
})

test('sorts status in board order and epics by name', () => {
  const tasks = [task(1, 'a', { status: 'done' as Task['status'] }), task(2, 'b', { status: 'backlog' as Task['status'] }), task(3, 'c')]
  expect(taskTableGroups(tasks, { ...base, sortKey: 'status' }, lookups)[0].tasks.map((t) => t.id)).toEqual([2, 3, 1])
  const byEpic = [task(1, 'a', { epic_id: 1 }), task(2, 'b', { epic_id: 2 })]
  expect(taskTableGroups(byEpic, { ...base, sortKey: 'epic' }, lookups)[0].tasks.map((t) => t.id)).toEqual([2, 1])
})

test('filters by title, ignoring case', () => {
  const tasks = [task(1, 'Write spec'), task(2, 'Ship')]
  expect(taskTableGroups(tasks, { ...base, query: 'SPEC' }, lookups)[0].tasks.map((t) => t.id)).toEqual([1])
})

test('groups by a field, with the group labels', () => {
  const tasks = [task(1, 'a', { assignee_id: 7 }), task(2, 'b'), task(3, 'c', { assignee_id: 7 })]
  const groups = taskTableGroups(tasks, { ...base, groupBy: 'assignee' }, lookups)
  expect(groups.map((g) => [g.label, g.tasks.map((t) => t.id)])).toEqual([['Sam', [1, 3]], ['Unassigned', [2]]])
})

test('visibleColumns drops hidden ones and keeps the order', () => {
  expect(visibleColumns(new Set())).toEqual(TASK_COLUMNS.map((c) => c.key))
  expect(visibleColumns(new Set(['status', 'epic'] as const))).toEqual(['title', 'start_date', 'due_date', 'assignee', 'sprint'])
})

test('parseTaskTableConfig keeps good values and falls back for bad ones', () => {
  expect(parseTaskTableConfig({ sortKey: 'title', sortDir: 'desc', groupBy: 'epic', query: 'spec', hidden: ['epic', 'sprint'] }))
    .toEqual({ sortKey: 'title', sortDir: 'desc', groupBy: 'epic', query: 'spec', hidden: ['epic', 'sprint'] })
  expect(parseTaskTableConfig({ sortKey: 'nope', sortDir: 'sideways', groupBy: 'x', query: 5, hidden: 'epic' })).toEqual(DEFAULT_TASK_TABLE_CONFIG)
  expect(parseTaskTableConfig(null)).toEqual(DEFAULT_TASK_TABLE_CONFIG)
  expect(parseTaskTableConfig({ hidden: ['title', 'status', 'bogus'] }).hidden).toEqual(['status'])
})
