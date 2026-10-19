import type { Task } from '@/types'
import { buildTaskTree, epicLanes } from './task'

const task = (id: number, parent_id: number | null = null) => ({ id, title: `T${id}`, parent_id }) as unknown as Task

test('buildTaskTree nests subtasks to any depth', () => {
  const tree = buildTaskTree([task(1), task(2, 1), task(3, 2), task(4)])
  expect(tree.map((t) => t.id)).toEqual([1, 4])
  expect(tree[0].children[0].children[0].id).toBe(3)
})

test('a task whose parent is missing becomes a root', () => {
  expect(buildTaskTree([task(2, 99)]).map((t) => t.id)).toEqual([2])
})

test('epicLanes makes a lane per epic with tasks plus No epic, skipping empty lanes', () => {
  const t = (id: number, epic_id: number | null) => ({ id, epic_id }) as unknown as Task
  const lanes = epicLanes([t(1, 2), t(2, null), t(3, 1), t(4, 99), t(5, 2)], [{ id: 1, title: 'Onboarding' }, { id: 2, title: 'Billing' }, { id: 3, title: 'Empty' }])
  expect(lanes.map((l) => [l.title, l.tasks.map((x) => x.id)])).toEqual([
    ['Onboarding', [3]], ['Billing', [1, 5]], ['No epic', [2, 4]],
  ])
  expect(epicLanes([], [{ id: 1, title: 'A' }])).toEqual([])
})
