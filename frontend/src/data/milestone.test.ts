import { PLANNING_STATUSES, compareByTargetDate, healthLabel } from './milestone'

test('health labels read naturally', () => {
  expect(healthLabel('on_track')).toBe('On track')
  expect(healthLabel('at_risk')).toBe('At risk')
  expect(healthLabel('off_track')).toBe('Off track')
})

test('statuses run from planned to done', () => {
  expect(PLANNING_STATUSES).toEqual(['planned', 'active', 'done'])
})

test('milestones sort by target date, undated last, ties by title', () => {
  const m = (title: string, target_date: string | null) => ({ title, target_date })
  const sorted = [m('Late', '2026-12-01'), m('Undated', null), m('B', '2026-06-01'), m('A', '2026-06-01')].sort(compareByTargetDate)
  expect(sorted.map((x) => x.title)).toEqual(['A', 'B', 'Late', 'Undated'])
})
