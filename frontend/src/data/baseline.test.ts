import { slipDays, withBaseline } from './baseline'
import type { Scheduled } from './schedule'
import type { Baseline } from '@/types'

const row = (id: number, start: string, end: string): Scheduled => ({ id: -id, key: `task-${id}`, title: `T${id}`, start_date: start, target_date: end, tasks_count: 1, done_tasks_count: 0 })
const baseline: Baseline = {
  id: 1, name: 'Kickoff', folder_id: 1, created_at: '',
  tasks: [{ task_id: 1, start_date: '2026-11-01', due_date: '2026-11-05' }, { task_id: 2, start_date: null, due_date: '2026-11-09' }],
}

test('attaches planned dates by task, using the due date when there was no start', () => {
  const rows = withBaseline([row(1, '2026-11-02', '2026-11-08'), row(2, '2026-11-09', '2026-11-09'), row(3, '2026-11-01', '2026-11-02')], baseline)
  expect(rows[0].baseline).toEqual({ start_date: '2026-11-01', target_date: '2026-11-05' })
  expect(rows[1].baseline).toEqual({ start_date: '2026-11-09', target_date: '2026-11-09' })
  expect(rows[2].baseline).toBeUndefined()
})

test('without a baseline the rows are returned untouched', () => {
  const rows = [row(1, '2026-11-01', '2026-11-05')]
  expect(withBaseline(rows, null)).toBe(rows)
})

test('slipDays is the days past (or before) the planned end', () => {
  const [late] = withBaseline([row(1, '2026-11-02', '2026-11-08')], baseline)
  expect(slipDays(late)).toBe(3)
  const [early] = withBaseline([row(1, '2026-11-01', '2026-11-04')], baseline)
  expect(slipDays(early)).toBe(-1)
  expect(slipDays(row(9, '2026-11-01', '2026-11-04'))).toBeNull()
})
