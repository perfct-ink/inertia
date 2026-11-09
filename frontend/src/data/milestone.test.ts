import type { Milestone } from '@/types'
import { PLANNING_STATUSES, compareByTargetDate, healthCounts, healthLabel, nextMilestone } from './milestone'

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

describe('rollups for the dashboard', () => {
  const m = (id: number, status: Milestone['status'], health: Milestone['health'], target_date: string | null) =>
    ({ id, title: `M${id}`, status, health, target_date }) as unknown as Milestone
  const list = [
    m(1, 'active', 'at_risk', '2026-12-01'),
    m(2, 'active', 'on_track', '2026-11-15'),
    m(3, 'done', 'on_track', '2026-10-01'),
    m(4, 'planned', 'off_track', null),
    m(5, 'planned', 'off_track', '2026-10-20'),
  ]

  test('healthCounts skips finished milestones', () => {
    expect(healthCounts(list)).toEqual({ on_track: 1, at_risk: 1, off_track: 2 })
  })

  test('nextMilestone is the unfinished dated one that comes first, even a late one', () => {
    expect(nextMilestone(list)?.id).toBe(5)
    expect(nextMilestone([m(3, 'done', 'on_track', '2026-10-01'), m(4, 'planned', 'off_track', null)])).toBeNull()
    expect(nextMilestone([])).toBeNull()
  })
})
