import { dateStatus, todayISO } from './date'

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
