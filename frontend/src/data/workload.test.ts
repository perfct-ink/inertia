import { hoursByWeek, weekRange, weekStart, workload } from './workload'
import type { Task } from '@/types'

const task = (extra: Partial<Task>) => ({ id: 1, status: 'todo', assignee_id: 7, estimate_hours: null, start_date: null, due_date: null, ...extra }) as unknown as Task

test('weekStart is the Monday of the week', () => {
  expect(weekStart('2026-10-19')).toBe('2026-10-19') // a Monday
  expect(weekStart('2026-10-25')).toBe('2026-10-19') // the Sunday after
  expect(weekStart('2026-10-21')).toBe('2026-10-19')
})

test('weekRange lists consecutive Mondays', () => {
  expect(weekRange('2026-10-22', 3)).toEqual(['2026-10-19', '2026-10-26', '2026-11-02'])
})

test('hours spread evenly over the weekdays, split across weeks', () => {
  // Mon 19 Oct to Tue 27 Oct: 7 weekdays (19-23, 26, 27), 14 hours = 2/day
  expect(hoursByWeek({ estimate_hours: 14, start_date: '2026-10-19', due_date: '2026-10-27' })).toEqual({ '2026-10-19': 10, '2026-10-26': 4 })
})

test('a task with only a due date lands on that day, a weekend-only task on its first day', () => {
  expect(hoursByWeek({ estimate_hours: 6, start_date: null, due_date: '2026-10-21' })).toEqual({ '2026-10-19': 6 })
  expect(hoursByWeek({ estimate_hours: 6, start_date: '2026-10-24', due_date: '2026-10-25' })).toEqual({ '2026-10-19': 6 })
})

test('tasks without an estimate or a due date contribute nothing', () => {
  expect(hoursByWeek({ estimate_hours: null, start_date: null, due_date: '2026-10-21' })).toEqual({})
  expect(hoursByWeek({ estimate_hours: 5, start_date: null, due_date: null })).toEqual({})
})

test('workload sums per person per week, flags over-allocation, skips done tasks and counts unplanned ones', () => {
  const weeks = ['2026-10-19', '2026-10-26']
  const result = workload([
    task({ id: 1, estimate_hours: 30, start_date: '2026-10-19', due_date: '2026-10-23' }),
    task({ id: 2, estimate_hours: 20, start_date: '2026-10-19', due_date: '2026-10-23' }),
    task({ id: 3, estimate_hours: 8, due_date: '2026-10-28', assignee_id: null }),
    task({ id: 4, estimate_hours: 99, due_date: '2026-10-20', status: 'done' }),
    task({ id: 5, estimate_hours: null, due_date: '2026-10-20' }),
    task({ id: 6, estimate_hours: 4, due_date: null }),
  ], weeks, 40)
  expect(result.unplanned).toBe(2)
  expect(result.rows.map((r) => r.assigneeId)).toEqual([7, null])
  expect(result.rows[0]).toEqual({ assigneeId: 7, hours: [50, 0], total: 50, over: [10, 0] })
  expect(result.rows[1]).toEqual({ assigneeId: null, hours: [0, 8], total: 8, over: [0, 0] })
})
