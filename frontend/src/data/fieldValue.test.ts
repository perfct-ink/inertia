import vectors from './fieldValue.vectors.json'
import { defaultFormat, formatChoiceLabel, formatKey, formatValue, formatsOf, groupDigits, hasFormatChoice, isValidValue } from './fieldValue'

// The same cases run against FieldValue in backend/test/models/field_value_test.rb.

describe('shared vectors', () => {
  for (const [type, cases] of Object.entries(vectors.valid)) {
    test(`${type} accepts its valid values and rejects the rest`, () => {
      for (const value of cases.ok) expect(isValidValue(type, value)).toBe(true)
      for (const value of cases.bad) expect(isValidValue(type, value)).toBe(false)
    })
  }

  test('types list their formats', () => {
    for (const [type, keys] of Object.entries(vectors.formats)) expect(formatsOf(type).map((option) => option.key)).toEqual(keys)
  })

  test('values are shown in their format', () => {
    for (const [type, format, value, text] of vectors.display) {
      expect(formatValue(type as string, format as string | null, value)).toBe(text)
    }
  })
})

test('an unknown type is never valid', () => {
  expect(isValidValue('email', 'ada@example.com')).toBe(false)
})

test('only types with a choice of formats get a picker, and the first format is the default', () => {
  expect(hasFormatChoice('integer')).toBe(true)
  expect(hasFormatChoice('number')).toBe(true)
  expect(hasFormatChoice('date')).toBe(false)
  expect(defaultFormat('number')).toBe('plain')
  expect(defaultFormat('text')).toBeNull()
  expect(formatKey('number', 'commas')).toBe('commas')
  expect(formatKey('number', 'roman')).toBe('plain')
  expect(formatKey('date', 'commas')).toBeNull()
  expect(formatChoiceLabel(formatsOf('integer')[1])).toBe('With commas: 1,234')
})

test('groupDigits groups the whole part only', () => {
  expect(groupDigits('1234567.891')).toBe('1,234,567.891')
  expect(groupDigits('-1234')).toBe('-1,234')
  expect(groupDigits('999')).toBe('999')
  expect(groupDigits('0.12345')).toBe('0.12345')
})
