import type { Task } from '@/types'
import { buildTaskTree, NEXT_STATUS, STATUS_LABEL, TASK_STATUSES, tasksWithStatus } from './task'

const task = (id: number, parent_id: number | null = null) => ({ id, title: `T${id}`, parent_id }) as unknown as Task

test('buildTaskTree nests subtasks to any depth', () => {
  const tree = buildTaskTree([task(1), task(2, 1), task(3, 2), task(4)])
  expect(tree.map((t) => t.id)).toEqual([1, 4])
  expect(tree[0].children[0].children[0].id).toBe(3)
})

test('a task whose parent is missing becomes a root', () => {
  expect(buildTaskTree([task(2, 99)]).map((t) => t.id)).toEqual([2])
})

test('the status enum, labels and next-status chain agree', () => {
  expect(TASK_STATUSES).toEqual(['backlog', 'todo', 'in_progress', 'in_review', 'done'])
  for (const status of TASK_STATUSES) expect(STATUS_LABEL[status]).toBeTruthy()
  expect(NEXT_STATUS.backlog).toBe('todo')
  expect(NEXT_STATUS.done).toBeNull()
  // following next from backlog visits every status once
  const chain: string[] = []
  for (let s: typeof TASK_STATUSES[number] | null = 'backlog'; s; s = NEXT_STATUS[s]) chain.push(s)
  expect(chain).toEqual(TASK_STATUSES)
})

test('tasksWithStatus keeps order and only that status', () => {
  const t = (id: number, status: string) => ({ id, status }) as unknown as Task
  expect(tasksWithStatus([t(1, 'todo'), t(2, 'done'), t(3, 'todo')], 'todo').map((x) => x.id)).toEqual([1, 3])
})
