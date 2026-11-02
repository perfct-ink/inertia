import type { Task } from '@/types'
import { buildTaskTree, taskFolderId } from './task'

const task = (id: number, parent_id: number | null = null) => ({ id, title: `T${id}`, parent_id }) as unknown as Task

test('buildTaskTree nests subtasks to any depth', () => {
  const tree = buildTaskTree([task(1), task(2, 1), task(3, 2), task(4)])
  expect(tree.map((t) => t.id)).toEqual([1, 4])
  expect(tree[0].children[0].children[0].id).toBe(3)
})

test('a task whose parent is missing becomes a root', () => {
  expect(buildTaskTree([task(2, 99)]).map((t) => t.id)).toEqual([2])
})

test('taskFolderId is the task\'s own folder, else its document\'s', () => {
  expect(taskFolderId({ folder_id: 3, document: { folder_id: 9 } } as unknown as Task)).toBe(3)
  expect(taskFolderId({ folder_id: null, document: { folder_id: 9 } } as unknown as Task)).toBe(9)
  expect(taskFolderId({ folder_id: null } as unknown as Task)).toBeNull()
})
