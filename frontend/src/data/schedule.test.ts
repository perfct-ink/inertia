import { axisTicks, donePercent, groupGanttRows, milestoneMarkers, planningGanttRows, shiftedRange, trackWidthPx, weekendSpans, type Scheduled } from './schedule'

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

const dated = (id: number, title: string, start: string | null, target: string | null) =>
  ({ ...item(1, 0), id, title, start_date: start, target_date: target })
const epic = (id: number, start: string | null, target: string | null, parents: { initiative_id?: number | null; milestone_id?: number | null } = {}) =>
  ({ ...dated(id, `e${id}`, start, target), initiative_id: null, milestone_id: null, ...parents })
const initiative = (id: number, start: string | null, target: string | null, milestone_id: number | null = null) =>
  ({ ...dated(id, `i${id}`, start, target), milestone_id })
const milestone = (id: number, target_date: string | null) => ({ id, title: `m${id}`, target_date, tasks_count: 4, done_tasks_count: 1 })
const task = (id: number, epic_id: number | null, start_date: string | null, due_date: string | null, milestone_id: number | null = null) =>
  ({ id, title: `t${id}`, status: 'todo', epic_id, start_date, due_date, milestone_id })
const outline = (rows: Scheduled[]) => rows.map((r) => `${r.depth}:${r.key}`)

test('groupGanttRows nests milestone > initiative > epic > task', () => {
  const rows = groupGanttRows(
    [epic(1, '2026-03-01', '2026-03-31', { initiative_id: 5 }), epic(2, '2026-04-01', '2026-04-30', { milestone_id: 7 }), epic(3, '2026-05-01', '2026-05-31')],
    [task(10, 1, '2026-03-02', '2026-03-05'), task(11, null, '2026-04-02', '2026-04-03', 7), task(12, null, '2026-06-01', '2026-06-02')],
    new Set([10]),
    { initiatives: [initiative(5, '2026-03-01', '2026-04-15', 7)], milestones: [milestone(7, '2026-04-30'), milestone(8, '2026-01-31')] },
  )
  expect(outline(rows)).toEqual([
    '0:milestone-7',
    '1:initiative-5',
    '2:epic-1',
    '3:task-10',
    '1:epic-2',
    '1:task-11',
    '0:epic-3',
    '0:task-12',
  ])
  expect(rows.filter((r) => r.group).map((r) => r.key)).toEqual(['milestone-7', 'initiative-5'])
  expect(rows[3].critical).toBe(true)
  expect(rows[0]).toMatchObject({ id: 7, title: 'm7', tasks_count: 4, done_tasks_count: 1 })
})

test('groupGanttRows draws a group with its own dates, else the span of what is under it', () => {
  const rows = groupGanttRows(
    [epic(1, '2026-03-10', '2026-03-20', { initiative_id: 5 }), epic(2, '2026-02-01', '2026-02-10', { initiative_id: 6 })],
    [task(10, 1, '2026-03-12', '2026-05-01')],
    new Set(),
    { initiatives: [initiative(5, '2026-03-01', '2026-03-31', 7), initiative(6, null, null, 7)], milestones: [milestone(7, '2026-04-15')] },
  )
  const byKey = new Map(rows.map((r) => [r.key, r]))
  // i5 keeps its plan even though its task runs to May; i6 has no dates of its own.
  expect([byKey.get('initiative-5')!.start_date, byKey.get('initiative-5')!.target_date]).toEqual(['2026-03-01', '2026-03-31'])
  expect([byKey.get('initiative-6')!.start_date, byKey.get('initiative-6')!.target_date]).toEqual(['2026-02-01', '2026-02-10'])
  // The milestone covers everything under it, including the May task and its own April date.
  expect([byKey.get('milestone-7')!.start_date, byKey.get('milestone-7')!.target_date]).toEqual(['2026-02-01', '2026-05-01'])
})

test('groupGanttRows widens a milestone to its target date and orders milestones by date', () => {
  const rows = groupGanttRows(
    [epic(1, '2026-03-10', '2026-03-20', { milestone_id: 2 }), epic(2, '2026-01-10', '2026-01-20', { milestone_id: 1 })],
    [],
    new Set(),
    { milestones: [milestone(2, '2026-06-30'), milestone(1, '2026-01-31')] },
  )
  expect(outline(rows)).toEqual(['0:milestone-1', '1:epic-2', '0:milestone-2', '1:epic-1'])
  expect([rows[0].start_date, rows[0].target_date]).toEqual(['2026-01-10', '2026-01-31'])
  expect([rows[2].start_date, rows[2].target_date]).toEqual(['2026-03-10', '2026-06-30'])
})

test('groupGanttRows leaves off empty groups and ignores parents that are not listed', () => {
  const rows = groupGanttRows(
    [epic(1, '2026-03-01', '2026-03-31', { initiative_id: 99, milestone_id: 98 })],
    [task(10, 1, '2026-03-02', '2026-03-05')],
    new Set(),
    { initiatives: [initiative(5, '2026-01-01', '2026-02-01')], milestones: [milestone(7, '2026-04-30')] },
  )
  expect(outline(rows)).toEqual(['0:epic-1', '1:task-10'])
})

test('groupGanttRows skips a group that has no dates to draw but keeps its children', () => {
  const rows = groupGanttRows(
    [epic(1, null, null, { initiative_id: 5 })],
    [task(10, 1, '2026-03-02', '2026-03-05')],
    new Set(),
    { initiatives: [initiative(5, null, null, 7)], milestones: [milestone(7, null)] },
  )
  expect(outline(rows)).toEqual(['0:epic-1', '0:task-10'])
})

test('groupGanttRows keeps an empty initiative only when asked, and undated ones are listed undrawn', () => {
  const groups = { initiatives: [initiative(5, '2026-03-01', '2026-03-31'), initiative(6, null, null)] }
  expect(groupGanttRows([], [], new Set(), groups)).toEqual([])
  const kept = groupGanttRows([], [], new Set(), { ...groups, keepEmptyInitiatives: true })
  expect(outline(kept)).toEqual(['0:initiative-5', '0:initiative-6'])
  expect(kept[1].start_date).toBeNull()
})

test('planningGanttRows draws only tasks under the listed epics', () => {
  const rows = planningGanttRows({
    milestones: [milestone(7, '2026-04-30')],
    initiatives: [initiative(5, '2026-03-01', '2026-03-31', 7)],
    epics: [epic(1, '2026-03-01', '2026-03-31', { initiative_id: 5 })],
    tasks: [task(10, 1, '2026-03-02', '2026-03-05'), task(11, 2, '2026-03-02', '2026-03-05'), task(12, null, '2026-03-02', '2026-03-05')],
  })
  expect(outline(rows)).toEqual(['0:milestone-7', '1:initiative-5', '2:epic-1', '3:task-10'])
})

test('milestoneMarkers keeps the dated milestones', () => {
  expect(milestoneMarkers([milestone(1, '2026-01-31'), milestone(2, null)])).toEqual([{ id: 1, title: 'm1', target_date: '2026-01-31' }])
})

test('shiftedRange moves both ends or resizes one edge without crossing', () => {
  expect(shiftedRange('2026-01-30', '2026-02-02', 'move', 3)).toEqual({ start: '2026-02-02', end: '2026-02-05' })
  expect(shiftedRange('2026-01-10', '2026-01-20', 'end', -4)).toEqual({ start: '2026-01-10', end: '2026-01-16' })
  expect(shiftedRange('2026-01-10', '2026-01-20', 'end', -30)).toEqual({ start: '2026-01-10', end: '2026-01-10' })
  expect(shiftedRange('2026-01-10', '2026-01-20', 'start', 30)).toEqual({ start: '2026-01-20', end: '2026-01-20' })
  expect(shiftedRange('2026-01-10', '2026-01-20', 'start', -2)).toEqual({ start: '2026-01-08', end: '2026-01-20' })
})

describe('gantt zoom axis', () => {
  const start = new Date(2026, 9, 14) // Wed 14 Oct 2026
  const end = new Date(2026, 10, 15) // Sun 15 Nov 2026 (33 days)

  test('ticks cover the range exactly once at every zoom', () => {
    for (const zoom of ['day', 'week', 'month', 'quarter', 'year'] as const) {
      expect(axisTicks(start, end, zoom).reduce((sum, t) => sum + t.days, 0)).toBe(33)
    }
  })

  test('ticks are clipped to the range and labelled for their zoom', () => {
    expect(axisTicks(start, end, 'month').map((t) => [t.label, t.days])).toEqual([['Oct 2026', 18], ['Nov 2026', 15]])
    expect(axisTicks(start, end, 'week').map((t) => [t.label, t.days])).toEqual([['Oct 12', 5], ['Oct 19', 7], ['Oct 26', 7], ['Nov 2', 7], ['Nov 9', 7]])
    expect(axisTicks(start, end, 'quarter').map((t) => [t.label, t.days])).toEqual([['Q4 2026', 33]])
    expect(axisTicks(start, end, 'year').map((t) => [t.label, t.days])).toEqual([['2026', 33]])
    expect(axisTicks(start, end, 'day')).toHaveLength(33)
    expect(axisTicks(start, end, 'day')[0].label).toBe('14')
  })

  test('weekend runs join Saturday and Sunday', () => {
    expect(weekendSpans(start, end)).toEqual([
      { offset: 3, days: 2 }, { offset: 10, days: 2 }, { offset: 17, days: 2 }, { offset: 24, days: 2 }, { offset: 31, days: 2 },
    ])
    // A range that starts on a Sunday begins with a one-day run.
    expect(weekendSpans(new Date(2026, 9, 18), new Date(2026, 9, 20))).toEqual([{ offset: 0, days: 1 }])
  })

  test('chart width scales with zoom; months fit the page', () => {
    expect(trackWidthPx(33, 'day')).toBe(1188)
    expect(trackWidthPx(33, 'month')).toBe(0)
    expect(trackWidthPx(365, 'year')).toBe(365)
  })
})
