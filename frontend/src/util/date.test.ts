import { addDaysISO, dateStatus, todayISO } from './date'

afterEach(() => jest.useRealTimers())

test('todayISO formats the local date as YYYY-MM-DD', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 0, 5, 23, 30))
  expect(todayISO()).toBe('2026-01-05')
})

test('dateStatus compares a date with today', () => {
  jest.useFakeTimers().setSystemTime(new Date(2026, 5, 15, 12))
  expect(dateStatus('2026-06-14')).toBe('overdue')
  expect(dateStatus('2026-06-15')).toBe('today')
  expect(dateStatus('2026-06-16')).toBe('upcoming')
})

test('addDaysISO moves a date across month and year ends, forwards and back', () => {
  expect(addDaysISO('2026-11-02', 13)).toBe('2026-11-15')
  expect(addDaysISO('2026-12-30', 3)).toBe('2027-01-02')
  expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28')
  expect(addDaysISO('2026-11-02', 0)).toBe('2026-11-02')
})
