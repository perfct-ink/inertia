import type { Task } from '@/types'
import { buildTaskTree, estimateLabel, pointsLabel, priorityLabel } from './task'

const task = (id: number, parent_id: number | null = null) => ({ id, title: `T${id}`, parent_id }) as unknown as Task

test('buildTaskTree nests subtasks to any depth', () => {
  const tree = buildTaskTree([task(1), task(2, 1), task(3, 2), task(4)])
  expect(tree.map((t) => t.id)).toEqual([1, 4])
  expect(tree[0].children[0].children[0].id).toBe(3)
})

test('a task whose parent is missing becomes a root', () => {
  expect(buildTaskTree([task(2, 99)]).map((t) => t.id)).toEqual([2])
})

test('priorityLabel hides none, pointsLabel and estimateLabel format what is set', () => {
  expect(priorityLabel('none')).toBeNull()
  expect(priorityLabel(undefined)).toBeNull()
  expect(priorityLabel('urgent')).toBe('Urgent')
  expect(pointsLabel({ story_points: 5, actual_story_points: null })).toBe('5 pts')
  expect(pointsLabel({ story_points: 5, actual_story_points: 8 })).toBe('5 → 8 pts')
  expect(pointsLabel({ story_points: null, actual_story_points: 3 })).toBe('3 pts actual')
  expect(pointsLabel({ story_points: null, actual_story_points: null })).toBeNull()
  expect(pointsLabel({ story_points: 0, actual_story_points: null })).toBe('0 pts')
  expect(estimateLabel(6.5)).toBe('6.5 h')
  expect(estimateLabel(null)).toBeNull()
})
