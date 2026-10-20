import { EXPORT_CHART_WIDTH, EXPORT_HEADER_HEIGHT, EXPORT_LABEL_WIDTH, EXPORT_ROW_HEIGHT, ganttExportLayout, ganttFileName } from './ganttExport'
import type { Scheduled } from './schedule'

const item = (title: string, start: string | null, end: string | null, done = 0, total = 0, extra: Partial<Scheduled> = {}): Scheduled =>
  ({ id: 1, title, start_date: start, target_date: end, tasks_count: total, done_tasks_count: done, ...extra })

test('places bars by date across the months of the range', () => {
  // The range is Nov 1 to Dec 31 2026: 61 days, November being the first 30.
  const layout = ganttExportLayout([item('A', '2026-11-01', '2026-11-30'), item('B', '2026-12-01', '2026-12-31')], new Date(2026, 0, 1))
  const day = EXPORT_CHART_WIDTH / 61
  expect(layout.months.map((m) => m.label)).toEqual(['Nov 2026', 'Dec 2026'])
  expect(layout.rows[0].bar!.x).toBeCloseTo(EXPORT_LABEL_WIDTH)
  expect(layout.rows[0].bar!.width).toBeCloseTo(30 * day)
  expect(layout.rows[1].bar!.x).toBeCloseTo(EXPORT_LABEL_WIDTH + 30 * day)
  expect(layout.rows[1].bar!.width).toBeCloseTo(31 * day)
  expect(layout.months[1].x).toBeCloseTo(EXPORT_LABEL_WIDTH + 30 * day)
})

test('rows are stacked below the header, and the image is as tall as its rows', () => {
  const layout = ganttExportLayout([item('A', '2026-11-01', '2026-11-05'), item('B', '2026-11-06', '2026-11-10')], new Date(2026, 0, 1))
  expect(layout.rows.map((r) => r.y)).toEqual([EXPORT_HEADER_HEIGHT, EXPORT_HEADER_HEIGHT + EXPORT_ROW_HEIGHT])
  expect(layout.height).toBe(EXPORT_HEADER_HEIGHT + 2 * EXPORT_ROW_HEIGHT + 8)
  expect(layout.width).toBe(EXPORT_LABEL_WIDTH + EXPORT_CHART_WIDTH)
})

test('the done part of a bar follows the task counts, and critical and depth carry over', () => {
  const layout = ganttExportLayout([item('A', '2026-11-01', '2026-11-30', 1, 4, { critical: true, depth: 1 })], new Date(2026, 0, 1))
  const row = layout.rows[0]
  expect(row.bar!.doneWidth).toBeCloseTo(row.bar!.width * 0.25)
  expect([row.critical, row.depth]).toEqual([true, 1])
})

test('an undated item is listed with no bar; with nothing dated the range is the current month', () => {
  const layout = ganttExportLayout([item('Someday', null, null)], new Date(2026, 10, 15))
  expect(layout.rows[0].bar).toBeNull()
  expect(layout.months.map((m) => m.label)).toEqual(['Nov 2026'])
})

test("today's line appears only inside the range", () => {
  const inside = ganttExportLayout([item('A', '2026-11-01', '2026-11-30')], new Date(2026, 10, 15))
  expect(inside.todayX).not.toBeNull()
  expect(inside.todayX!).toBeGreaterThan(EXPORT_LABEL_WIDTH)
  expect(ganttExportLayout([item('A', '2026-11-01', '2026-11-30')], new Date(2027, 5, 1)).todayX).toBeNull()
})

test('file names are safe', () => {
  expect(ganttFileName('Launch plan')).toBe('Launch plan gantt.png')
  expect(ganttFileName('A/B: "Beta"', 'pdf')).toBe('AB Beta gantt.pdf')
  expect(ganttFileName('///')).toBe('Gantt gantt.png')
})
