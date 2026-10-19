import type { Task } from '@/types'
import { buildTaskTree, dueBucket, myWork } from './task'

const task = (id: number, parent_id: number | null = null) => ({ id, title: `T${id}`, parent_id }) as unknown as Task

test('buildTaskTree nests subtasks to any depth', () => {
  const tree = buildTaskTree([task(1), task(2, 1), task(3, 2), task(4)])
  expect(tree.map((t) => t.id)).toEqual([1, 4])
  expect(tree[0].children[0].children[0].id).toBe(3)
})

test('a task whose parent is missing becomes a root', () => {
  expect(buildTaskTree([task(2, 99)]).map((t) => t.id)).toEqual([2])
})

test('dueBucket sorts dates against today, with the week being the next six days', () => {
  expect(dueBucket(null, '2026-10-19')).toBe('no_date')
  expect(dueBucket('2026-10-18', '2026-10-19')).toBe('overdue')
  expect(dueBucket('2026-10-19', '2026-10-19')).toBe('today')
  expect(dueBucket('2026-10-25', '2026-10-19')).toBe('this_week')
  expect(dueBucket('2026-10-26', '2026-10-19')).toBe('later')
  expect(dueBucket('2026-11-02', '2026-10-30')).toBe('this_week')
})

test('myWork groups my open tasks by due date and skips done and other people', () => {
  const t = (id: number, assignee_id: number | null, due_date: string | null, status = 'todo', title = `T${id}`) =>
    ({ id, title, assignee_id, due_date, status }) as unknown as Task
  const groups = myWork([
    t(1, 5, '2026-10-30'), t(2, 5, '2026-10-17'), t(3, 6, '2026-10-17'), t(4, 5, null), t(5, 5, '2026-10-19', 'done'),
    t(6, 5, '2026-10-17', 'todo', 'A first'),
  ], 5, '2026-10-19')
  expect(groups.map((g) => g.bucket)).toEqual(['overdue', 'later', 'no_date'])
  expect(groups[0].tasks.map((x) => x.id)).toEqual([6, 2])
  expect(myWork([], 5, '2026-10-19')).toEqual([])
})
