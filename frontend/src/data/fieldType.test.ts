import { DATA_TYPES, FIELD_TYPES, formatValue, isNumericType } from './fieldType'

test('lists the original and the new types', () => {
  expect(DATA_TYPES).toEqual(expect.arrayContaining(['text', 'relation', 'email', 'phone', 'url', 'money', 'rating', 'vin', 'color']))
  expect(DATA_TYPES).toHaveLength(Object.keys(FIELD_TYPES).length)
})

test('formats values for display', () => {
  expect(formatValue('money', 1234.5)).toBe('$1,234.50')
  expect(formatValue('mileage', 42000)).toBe('42,000 mi')
  expect(formatValue('percent', 99.5)).toBe('99.5%')
  expect(formatValue('rating', 4)).toBe('★★★★☆')
  expect(formatValue('email', 'a@b.co')).toBe('a@b.co')
  expect(formatValue('money', null)).toBe('')
})

test('knows which types store numbers', () => {
  expect(isNumericType('rating')).toBe(true)
  expect(isNumericType('email')).toBe(false)
})
