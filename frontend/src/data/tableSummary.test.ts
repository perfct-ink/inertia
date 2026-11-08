import { columnSummary, summaryText, withUnit } from './tableSummary'

test('sum, average, min, max and count of the numbers in a column', () => {
  const values = [3, 4.5, null, 'x', 2.5, undefined, true]
  expect(columnSummary(values, 'sum')).toBe(10)
  expect(columnSummary(values, 'average')).toBe(3.33)
  expect(columnSummary(values, 'min')).toBe(2.5)
  expect(columnSummary(values, 'max')).toBe(4.5)
  expect(columnSummary(values, 'count')).toBe(3)
})

test('no summary, or nothing numeric, gives null', () => {
  expect(columnSummary([1, 2], 'none')).toBeNull()
  expect(columnSummary([null, 'a'], 'sum')).toBeNull()
  expect(columnSummary([], 'max')).toBeNull()
})

test('a unit follows the number, but a currency symbol leads', () => {
  expect(withUnit(12.5, 'kg')).toBe('12.5 kg')
  expect(withUnit(12.5, '$')).toBe('$12.5')
  expect(withUnit(12.5, '')).toBe('12.5')
  expect(withUnit(null, 'kg')).toBe('')
})

test('a summary is written in the field format and unit; a count is a plain number', () => {
  expect(summaryText({ data_type: 'number', display_format: null, unit: 'kg' }, [3, 4.5], 'sum')).toBe('7.5 kg')
  expect(summaryText({ data_type: 'number', display_format: null, unit: 'kg' }, [3, 4.5], 'count')).toBe('2')
  expect(summaryText({ data_type: 'number', display_format: 'commas', unit: 'kg' }, [1000, 2345.5], 'sum')).toBe('3,345.5 kg')
  expect(summaryText({ data_type: 'money', display_format: 'eur', unit: null }, [1000, 250.5], 'sum')).toBe('€1,250.50')
  expect(summaryText({ data_type: 'percent', display_format: null, unit: null }, [10, 20], 'average')).toBe('15%')
  expect(summaryText({ data_type: 'money', display_format: null, unit: null }, [], 'sum')).toBe('')
})
