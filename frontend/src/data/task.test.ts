import type { Task } from '@/types'
import { autoFields, buildTaskTree } from './task'

const task = (id: number, parent_id: number | null = null) => ({ id, title: `T${id}`, parent_id }) as unknown as Task

test('buildTaskTree nests subtasks to any depth', () => {
  const tree = buildTaskTree([task(1), task(2, 1), task(3, 2), task(4)])
  expect(tree.map((t) => t.id)).toEqual([1, 4])
  expect(tree[0].children[0].children[0].id).toBe(3)
})

test('a task whose parent is missing becomes a root', () => {
  expect(buildTaskTree([task(2, 99)]).map((t) => t.id)).toEqual([2])
})

test('autoFields shows the item ID, creator and relative times', () => {
  const now = new Date('2026-10-21T12:00:00Z')
  const fields = autoFields({ id: 12, created_by_name: 'Ada', created_at: '2026-10-19T12:00:00Z', updated_at: '2026-10-21T10:00:00Z' }, now)
  expect(fields).toEqual({ itemId: '#12', createdBy: 'Ada', created: '2 days ago', updated: 'about 2 hours ago' })
})

test('autoFields leaves out what the server does not know', () => {
  const fields = autoFields({ id: 3 })
  expect(fields).toEqual({ itemId: '#3', createdBy: null, created: null, updated: null })
})
