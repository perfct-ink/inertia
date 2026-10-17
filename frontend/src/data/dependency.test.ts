import type { TaskDependency } from '@/types'
import { drivingPath, linkSides } from './dependency'

const dep = (predecessor_id: number, successor_id: number, kind: TaskDependency['kind'] = 'finish_to_start') =>
  ({ id: predecessor_id * 100 + successor_id, predecessor_id, successor_id, kind, created_at: '' })

test('link sides follow the kind name', () => {
  expect(linkSides('finish_to_start')).toEqual({ from: 'end', to: 'start' })
  expect(linkSides('start_to_finish')).toEqual({ from: 'start', to: 'end' })
})

test('the driving path walks back from the last finish through the latest predecessor', () => {
  const tasks = [
    { id: 1, start_date: '2026-11-01', due_date: '2026-11-05' },
    { id: 2, start_date: '2026-11-01', due_date: '2026-11-10' },
    { id: 3, start_date: '2026-11-11', due_date: '2026-11-20' },
    { id: 4, start_date: null, due_date: null },
  ]
  expect([...drivingPath(tasks, [dep(1, 3), dep(2, 3), dep(4, 3)])].sort()).toEqual([2, 3])
})

test('no links, or a last task with no predecessors, is no path', () => {
  const tasks = [{ id: 1, due_date: '2026-11-05' }, { id: 2, due_date: '2026-11-10' }]
  expect(drivingPath(tasks, []).size).toBe(0)
  expect(drivingPath(tasks, [dep(2, 1)]).size).toBe(0)
})
