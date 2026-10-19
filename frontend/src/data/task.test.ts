import type { Task } from '@/types'
import { buildTaskTree } from './task'

const task = (id: number, parent_id: number | null = null) => ({ id, title: `T${id}`, parent_id }) as unknown as Task

test('buildTaskTree nests subtasks to any depth', () => {
  const tree = buildTaskTree([task(1), task(2, 1), task(3, 2), task(4)])
  expect(tree.map((t) => t.id)).toEqual([1, 4])
  expect(tree[0].children[0].children[0].id).toBe(3)
})

test('a task whose parent is missing becomes a root', () => {
  expect(buildTaskTree([task(2, 99)]).map((t) => t.id)).toEqual([2])
})

test('statusChangeLabel reads the creation row and transitions', () => {
  expect(statusChangeLabel({ from_status: null, to_status: 'todo' })).toBe('Created as To Do')
  expect(statusChangeLabel({ from_status: 'in_review', to_status: 'done' })).toBe('In Review → Done')
})
