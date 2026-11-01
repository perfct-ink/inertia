import {
  addDays, addMonths, clampToRange, dayLabel, isValidISODate, monthGrid, monthLabel, outOfRange, parseISODate, startOfWeek,
  toISODate, weekday, weekdayHeadings,
} from './calendar'

test('parses only real calendar dates', () => {
  expect(parseISODate('2026-11-02')).toEqual({ year: 2026, month: 11, day: 2 })
  expect(isValidISODate('2028-02-29')).toBe(true)
  expect(isValidISODate('2026-02-29')).toBe(false)
  expect(isValidISODate('2026-13-01')).toBe(false)
  expect(isValidISODate('2026-11-3')).toBe(false)
  expect(isValidISODate('2026-11')).toBe(false)
  expect(isValidISODate('')).toBe(false)
  expect(toISODate(2026, 1, 5)).toBe('2026-01-05')
})

test('adds days across month and year ends', () => {
  expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  expect(addDays('2026-11-02', 7)).toBe('2026-11-09')
  expect(addDays('not a date', 1)).toBe('not a date')
})

test('adds months and keeps the day where the month has it', () => {
  expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
  expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
  expect(addMonths('2026-11-15', 2)).toBe('2027-01-15')
  expect(addMonths('2026-01-15', -2)).toBe('2025-11-15')
  expect(addMonths('2026-03-31', -1)).toBe('2026-02-28')
})

test('finds weekdays and week starts', () => {
  expect(weekday('2026-11-01')).toBe(0)
  expect(weekday('2026-11-02')).toBe(1)
  expect(startOfWeek('2026-11-04', 0)).toBe('2026-11-01')
  expect(startOfWeek('2026-11-04', 1)).toBe('2026-11-02')
  expect(startOfWeek('2026-11-01', 1)).toBe('2026-10-26')
})

test('the month grid is six weeks that start on the first day of the week', () => {
  const grid = monthGrid(2026, 11, 0)
  expect(grid).toHaveLength(6)
  expect(grid.every((week) => week.length === 7)).toBe(true)
  expect(grid[0][0]).toEqual({ iso: '2026-11-01', day: 1, inMonth: true })
  expect(grid[4][1]).toEqual({ iso: '2026-11-30', day: 30, inMonth: true })
  expect(grid[4][2]).toEqual({ iso: '2026-12-01', day: 1, inMonth: false })
  expect(grid[5][6].iso).toBe('2026-12-12')
  const monday = monthGrid(2026, 11, 1)
  expect(monday[0][0]).toEqual({ iso: '2026-10-26', day: 26, inMonth: false })
  expect(monday[0][6]).toEqual({ iso: '2026-11-01', day: 1, inMonth: true })
  expect(monthGrid(2026, 2, 0).flat().filter((d) => d.inMonth)).toHaveLength(28)
  expect(monthGrid(2028, 2, 0).flat().filter((d) => d.inMonth)).toHaveLength(29)
})

test('bounds work like the native min and max', () => {
  expect(outOfRange('2026-11-01', '2026-11-02', undefined)).toBe(true)
  expect(outOfRange('2026-11-02', '2026-11-02', '2026-11-30')).toBe(false)
  expect(outOfRange('2026-12-01', undefined, '2026-11-30')).toBe(true)
  expect(outOfRange('2026-12-01')).toBe(false)
  expect(clampToRange('2026-10-01', '2026-11-02', '2026-11-30')).toBe('2026-11-02')
  expect(clampToRange('2026-12-31', '2026-11-02', '2026-11-30')).toBe('2026-11-30')
  expect(clampToRange('2026-11-10', '2026-11-02', '2026-11-30')).toBe('2026-11-10')
})

test('labels are in the browser locale and independent of the time zone', () => {
  expect(monthLabel(2026, 11, 'en-US')).toBe('November 2026')
  expect(dayLabel('2026-11-02', 'en-US')).toBe('Monday, November 2, 2026')
  expect(weekdayHeadings(0, 'en-US').map((h) => h.short)).toEqual(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'])
  expect(weekdayHeadings(1, 'en-US')[0]).toEqual({ short: 'Mo', full: 'Monday' })
})
