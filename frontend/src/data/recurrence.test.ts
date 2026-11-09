import { RECURRENCE_OPTIONS, recurrenceLabel, recurrenceOptions } from './recurrence'

test('the picker options keep the rules and reword only the "none" entry', () => {
  const options = recurrenceOptions('Not ongoing')
  expect(options).toHaveLength(RECURRENCE_OPTIONS.length)
  expect(options[0]).toEqual({ value: '', label: 'Not ongoing' })
  expect(options.slice(1)).toEqual(RECURRENCE_OPTIONS.slice(1))
  expect(recurrenceOptions('Does not repeat')[0].label).toBe(RECURRENCE_OPTIONS[0].label)
})

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
