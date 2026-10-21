import type { Task } from '@/types'
import { buildTaskTree, elapsedClock, formatMinutes, progressById, subtaskProgress } from './task'

const task = (id: number, parent_id: number | null = null) => ({ id, title: `T${id}`, parent_id }) as unknown as Task

test('buildTaskTree nests subtasks to any depth', () => {
  const tree = buildTaskTree([task(1), task(2, 1), task(3, 2), task(4)])
  expect(tree.map((t) => t.id)).toEqual([1, 4])
  expect(tree[0].children[0].children[0].id).toBe(3)
})

test('a task whose parent is missing becomes a root', () => {
  expect(buildTaskTree([task(2, 99)]).map((t) => t.id)).toEqual([2])
})

const withStatus = (id: number, parent_id: number | null, status: Task['status']) =>
  ({ id, title: `T${id}`, parent_id, status }) as unknown as Task

test('progress counts every descendant, to any depth, and skips tasks with no subtasks', () => {
  const tasks = [
    withStatus(1, null, 'todo'),
    withStatus(2, 1, 'done'),
    withStatus(3, 1, 'in_progress'),
    withStatus(4, 3, 'done'),
    withStatus(5, null, 'done'),
  ]
  expect(subtaskProgress(buildTaskTree(tasks)[0])).toEqual({ done: 2, total: 3, percent: 67 })
  const byId = progressById(tasks)
  expect(byId.get(3)).toEqual({ done: 1, total: 1, percent: 100 })
  expect(byId.has(5)).toBe(false)
  expect(byId.has(2)).toBe(false)
})

test('formatMinutes', () => {
  expect([0, 45, 60, 135, -5].map(formatMinutes)).toEqual(['0m', '45m', '1h', '2h 15m', '0m'])
})

test('elapsedClock shows hours, minutes and seconds since the start', () => {
  expect(elapsedClock('2026-10-21T10:00:00Z', new Date('2026-10-21T11:05:09Z'))).toBe('1:05:09')
  expect(elapsedClock('2026-10-21T10:00:00Z', new Date('2026-10-21T09:00:00Z'))).toBe('0:00:00')
})
