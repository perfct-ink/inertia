import { planningSummary } from './planningSummary'
import type { Task, WorkspaceEvent } from '@/types'

const task = (status: string, due_date: string | null) => ({ status, due_date }) as unknown as Task
const event = (title: string, date: string) => ({ title, date }) as unknown as WorkspaceEvent

test('counts done and overdue tasks and the percent done', () => {
  const s = planningSummary([task('done', '2026-10-01'), task('todo', '2026-10-05'), task('todo', '2026-11-01'), task('in_progress', null)], [], '2026-10-19')
  expect(s).toMatchObject({ tasksCount: 4, doneTasksCount: 1, percent: 25, overdueCount: 1 })
})

test('no tasks is 0% and nothing overdue', () => {
  expect(planningSummary([], [], '2026-10-19')).toMatchObject({ tasksCount: 0, percent: 0, overdueCount: 0 })
})

test('upcoming events start today, are soonest first and limited', () => {
  const events = [event('Late', '2026-12-01'), event('Past', '2026-10-01'), event('Today', '2026-10-19'), event('Soon', '2026-10-25'), event('Later', '2026-11-15')]
  expect(planningSummary([], events, '2026-10-19').upcomingEvents.map((e) => e.title)).toEqual(['Today', 'Soon', 'Later'])
  expect(planningSummary([], events, '2026-10-19', 1).upcomingEvents).toHaveLength(1)
})
