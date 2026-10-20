import type { Task } from '@/types'
import { buildTaskTree, taskCards } from './task'

const task = (id: number, parent_id: number | null = null) => ({ id, title: `T${id}`, parent_id }) as unknown as Task

test('buildTaskTree nests subtasks to any depth', () => {
  const tree = buildTaskTree([task(1), task(2, 1), task(3, 2), task(4)])
  expect(tree.map((t) => t.id)).toEqual([1, 4])
  expect(tree[0].children[0].children[0].id).toBe(3)
})

test('a task whose parent is missing becomes a root', () => {
  expect(buildTaskTree([task(2, 99)]).map((t) => t.id)).toEqual([2])
})

test('taskCards makes one card per top-level task with epic, subtask progress and overdue', () => {
  const t = (id: number, extra: Partial<Task> = {}) => ({ id, title: `T${id}`, status: 'todo', parent_id: null, epic_id: null, due_date: null, ...extra }) as unknown as Task
  const cards = taskCards(
    [t(1, { epic_id: 7, due_date: '2026-10-01' }), t(2, { parent_id: 1, status: 'done' }), t(3, { parent_id: 2 }), t(4, { status: 'done', due_date: '2026-09-01' })],
    [{ id: 7, title: 'Launch' }],
    '2026-10-19',
  )
  expect(cards.map((c) => c.task.id)).toEqual([1, 4])
  expect(cards[0]).toMatchObject({ epicTitle: 'Launch', subtasks: { done: 1, total: 2 }, overdue: true })
  expect(cards[1]).toMatchObject({ epicTitle: null, subtasks: { done: 0, total: 0 }, overdue: false })
})
