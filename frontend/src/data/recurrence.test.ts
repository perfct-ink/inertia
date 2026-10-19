import { recurrenceLabel } from './recurrence'

test('labels known and custom rules', () => {
  expect(recurrenceLabel('FREQ=WEEKLY')).toBe('Weekly')
  expect(recurrenceLabel('FREQ=DAILY;INTERVAL=3')).toBe('Every 3 days')
  expect(recurrenceLabel('FREQ=MONTHLY;INTERVAL=1')).toBe('Every month')
})

test('returns null for empty or unsupported rules', () => {
  expect(recurrenceLabel(null)).toBeNull()
  expect(recurrenceLabel('')).toBeNull()
  expect(recurrenceLabel('FREQ=HOURLY')).toBeNull()
  expect(recurrenceLabel('FREQ=DAILY;INTERVAL=0')).toBeNull()
})
