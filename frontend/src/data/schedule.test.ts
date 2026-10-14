import { donePercent, type Scheduled } from './schedule'

const item = (tasks_count: number, done_tasks_count: number) =>
  ({ id: 1, title: 'x', start_date: null, target_date: null, tasks_count, done_tasks_count }) as Scheduled

test('donePercent rounds the share of finished tasks', () => {
  expect(donePercent(item(3, 1))).toBe(33)
  expect(donePercent(item(4, 4))).toBe(100)
})

test('donePercent is 0 when there are no tasks', () => {
  expect(donePercent(item(0, 0))).toBe(0)
})
