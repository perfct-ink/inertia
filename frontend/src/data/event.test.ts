import { EVENT_TYPES, filterTasksByTitle, splitEvents, unlinkedTasks } from './event'
import type { Task, WorkspaceEvent } from '@/types'

const task = (id: number, title: string) => ({ id, title }) as Task
const event = (id: number, date: string, tasks: Task[] = []) => ({ id, date, tasks }) as unknown as WorkspaceEvent

test('the event types mirror the API enum', () => {
  expect(EVENT_TYPES).toEqual(['deadline', 'milestone'])
})

test('filterTasksByTitle ignores case and an empty query keeps everything', () => {
  const tasks = [task(1, 'Write Spec'), task(2, 'Ship it')]
  expect(filterTasksByTitle(tasks, 'SPEC').map((t) => t.id)).toEqual([1])
  expect(filterTasksByTitle(tasks, '')).toHaveLength(2)
  expect(filterTasksByTitle(tasks, 'zzz')).toEqual([])
})

test('unlinkedTasks drops tasks already on the event', () => {
  const tasks = [task(1, 'A'), task(2, 'B'), task(3, 'C')]
  expect(unlinkedTasks(tasks, { tasks: [task(2, 'B')] }).map((t) => t.id)).toEqual([1, 3])
})

test('splitEvents puts today and later in upcoming, earlier days in past', () => {
  const now = new Date(2026, 9, 19, 15, 30)
  const { upcoming, past } = splitEvents([event(1, '2026-10-18'), event(2, '2026-10-19'), event(3, '2026-10-20')], now)
  expect(past.map((e) => e.id)).toEqual([1])
  expect(upcoming.map((e) => e.id)).toEqual([2, 3])
})
