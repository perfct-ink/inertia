import { donePercent, groupGanttRows, shiftedRange, type Scheduled } from './schedule'

const item = (tasks_count: number, done_tasks_count: number) =>
  ({ id: 1, title: 'x', start_date: null, target_date: null, tasks_count, done_tasks_count }) as Scheduled

test('donePercent rounds the share of finished tasks', () => {
  expect(donePercent(item(3, 1))).toBe(33)
  expect(donePercent(item(4, 4))).toBe(100)
})

test('donePercent is 0 when there are no tasks', () => {
  expect(donePercent(item(0, 0))).toBe(0)
})

test('groupGanttRows nests dated tasks under a drawn epic and leaves the rest top level', () => {
  const epic = (id: number, dated: boolean) => ({
    ...item(1, 0), id, title: `e${id}`, start_date: dated ? '2026-01-01' : null, target_date: dated ? '2026-02-01' : null,
  })
  const task = (id: number, epic_id: number | null, due_date: string | null) =>
    ({ id, title: `t${id}`, status: 'todo', epic_id, due_date })
  const rows = groupGanttRows(
    [epic(1, true), epic(2, false)],
    [task(10, 1, '2026-01-10'), task(11, 2, '2026-01-11'), task(12, null, '2026-01-12'), task(13, 1, null)],
  )
  expect(rows.map((r) => [r.id, r.depth])).toEqual([[1, 0], [-10, 1], [2, 0], [-11, 0], [-12, 0]])
})

test('shiftedRange moves both ends or resizes one edge without crossing', () => {
  expect(shiftedRange('2026-01-30', '2026-02-02', 'move', 3)).toEqual({ start: '2026-02-02', end: '2026-02-05' })
  expect(shiftedRange('2026-01-10', '2026-01-20', 'end', -4)).toEqual({ start: '2026-01-10', end: '2026-01-16' })
  expect(shiftedRange('2026-01-10', '2026-01-20', 'end', -30)).toEqual({ start: '2026-01-10', end: '2026-01-10' })
  expect(shiftedRange('2026-01-10', '2026-01-20', 'start', 30)).toEqual({ start: '2026-01-20', end: '2026-01-20' })
  expect(shiftedRange('2026-01-10', '2026-01-20', 'start', -2)).toEqual({ start: '2026-01-08', end: '2026-01-20' })
})
