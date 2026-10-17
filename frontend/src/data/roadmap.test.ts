import type { Milestone, Initiative, Epic } from '@/types'
import { boardColumns, effectiveHorizon, roadmapLanes, roadmapRange } from './roadmap'

const today = new Date(2026, 9, 17)
const milestone = (id: number, target_date: string | null = null) =>
  ({ id, title: `M${id}`, target_date, health: 'on_track', percent: 0 }) as unknown as Milestone
const initiative = (id: number, opts: Partial<Initiative> = {}) =>
  ({
    id, title: `I${id}`, status: 'planned', milestone_id: null, horizon: null, start_date: null, target_date: null,
    tasks_count: 0, done_tasks_count: 0, health: 'on_track', ...opts,
  }) as Initiative
const epic = (id: number, opts: Partial<Epic> = {}) =>
  ({
    id, title: `E${id}`, initiative_id: null, milestone_id: null, horizon: null, start_date: null, target_date: null,
    tasks_count: 0, done_tasks_count: 0, ...opts,
  }) as Epic

describe('effectiveHorizon', () => {
  test('a hand-placed horizon wins', () => {
    expect(effectiveHorizon(initiative(1, { horizon: 'later', status: 'active' }), today)).toBe('later')
  })

  test('active or already started is Now', () => {
    expect(effectiveHorizon(initiative(1, { status: 'active' }), today)).toBe('now')
    expect(effectiveHorizon(epic(1, { start_date: '2026-10-01' }), today)).toBe('now')
  })

  test('starting within 90 days is Next, later or undated is Later', () => {
    expect(effectiveHorizon(epic(1, { start_date: '2026-12-01' }), today)).toBe('next')
    expect(effectiveHorizon(epic(1, { start_date: '2027-06-01' }), today)).toBe('later')
    expect(effectiveHorizon(epic(1), today)).toBe('later')
  })
})

test('the board shows open initiatives and epics with no initiative, and drops finished work', () => {
  const columns = boardColumns(
    [initiative(1, { status: 'active' }), initiative(2, { status: 'done' })],
    [epic(1, { initiative_id: 1 }), epic(2, { horizon: 'next' }), epic(3, { tasks_count: 2, done_tasks_count: 2 })],
    today,
  )
  expect(columns.now.map((c) => c.key)).toEqual(['initiative-1'])
  expect(columns.now[0]).toMatchObject({ kind: 'initiative', epics: [expect.objectContaining({ id: 1 })] })
  expect(columns.next.map((c) => c.key)).toEqual(['epic-2'])
  expect(columns.later).toEqual([])
})

test('lanes follow milestone target dates, nest epics under their initiative, and end with No milestone', () => {
  const lanes = roadmapLanes(
    [milestone(1, '2027-01-01'), milestone(2, '2026-11-01'), milestone(3)],
    [initiative(1, { milestone_id: 1, health: 'at_risk' })],
    [epic(1, { initiative_id: 1, milestone_id: 2 }), epic(2, { milestone_id: 2 }), epic(3)],
  )
  expect(lanes.map((l) => l.key)).toEqual(['milestone-2', 'milestone-1', 'milestone-3', 'no-milestone'])
  expect(lanes[1].rows.map((r) => [r.key, r.depth, r.health])).toEqual([
    ['initiative-1', 0, 'at_risk'],
    ['epic-1', 1, undefined],
  ])
  expect(lanes[0].rows.map((r) => r.key)).toEqual(['epic-2'])
  expect(lanes[3].rows.map((r) => r.key)).toEqual(['epic-3'])
})

test('the shared axis spans every dated row and milestone date, month aligned', () => {
  const lanes = roadmapLanes(
    [milestone(1, '2027-02-10')],
    [initiative(1, { milestone_id: 1, start_date: '2026-11-15', target_date: '2026-12-20' })],
    [],
  )
  const range = roadmapRange(lanes)
  expect(range?.start).toEqual(new Date(2026, 10, 1))
  expect(range?.end.getMonth()).toBe(1)
  expect(roadmapLanes([], [initiative(1)], []).length).toBe(1)
  expect(roadmapRange(roadmapLanes([], [initiative(1)], []))).toBeNull()
})
