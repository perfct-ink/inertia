import type { Task } from '@/types'
import { buildTaskTree, filterByKind, kindOf } from './task'

const task = (id: number, parent_id: number | null = null) => ({ id, title: `T${id}`, parent_id }) as unknown as Task

test('buildTaskTree nests subtasks to any depth', () => {
  const tree = buildTaskTree([task(1), task(2, 1), task(3, 2), task(4)])
  expect(tree.map((t) => t.id)).toEqual([1, 4])
  expect(tree[0].children[0].children[0].id).toBe(3)
})

test('a task whose parent is missing becomes a root', () => {
  expect(buildTaskTree([task(2, 99)]).map((t) => t.id)).toEqual([2])
})

test('a task with no kind is a plain task', () => {
  expect(kindOf({})).toBe('task')
  expect(kindOf({ kind: 'bug' })).toBe('bug')
})

test('filterByKind builds the bugs queue and passes everything through without a kind', () => {
  const items = [{ id: 1, kind: 'bug' as const }, { id: 2 }, { id: 3, kind: 'story' as const }, { id: 4, kind: 'bug' as const }]
  expect(filterByKind(items, 'bug').map((t) => t.id)).toEqual([1, 4])
  expect(filterByKind(items, 'task').map((t) => t.id)).toEqual([2])
  expect(filterByKind(items)).toHaveLength(4)
})
