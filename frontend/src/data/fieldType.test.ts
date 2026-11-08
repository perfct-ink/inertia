import vectors from './fieldType.vectors.json'
import {
  DATA_TYPES, FIELD_TYPES, choicesProblem, defaultFormat, displayValue, fieldTypeText, formatChoiceLabel, formatKey, formatValue, formatsOf, hasFormatChoice,
  isReadOnly, isSummarizable, isValidValue, normalizeValue, plainValues, recordProblem, valueProblem,
} from './fieldType'
import type { FieldDataType } from '@/api/tables'

// The same cases run against FieldType in backend/test/models/field_type_test.rb.
const asType = (type: string) => type as FieldDataType

test('every type that can hold a typed value has vectors, and all of them are known types', () => {
  expect(Object.keys(vectors.valid).sort()).toEqual(
    DATA_TYPES.filter((type) => ['value', 'automatic'].includes(FIELD_TYPES[type].kind)).sort(),
  )
})

describe('shared vectors', () => {
  for (const [type, cases] of Object.entries(vectors.valid)) {
    test(`${type} accepts its valid values and rejects the rest`, () => {
      for (const value of cases.ok) expect(isValidValue(asType(type), value, vectors.options)).toBe(true)
      for (const value of cases.bad) expect(isValidValue(asType(type), value, vectors.options)).toBe(false)
    })
    test(`${type} keeps a valid value as it is`, () => {
      for (const value of cases.ok) expect(normalizeValue(asType(type), value)).toEqual(value)
    })
  }

  test('typed text is read into the plain value', () => {
    for (const [type, input, expected] of vectors.normalize) expect(normalizeValue(asType(type as string), input)).toEqual(expected)
  })

  test('values are shown in their format', () => {
    for (const [type, format, value, text] of vectors.display) {
      expect(formatValue(asType(type as string), format as string | null, value)).toBe(text)
    }
  })
})

test('credit card, CVV, password and VIN are not field types', () => {
  for (const type of ['credit_card', 'cvv', 'password', 'vin']) expect(DATA_TYPES).not.toContain(type)
})

test('only a type with several formats gets a format picker, and the first is the default', () => {
  expect(hasFormatChoice('money')).toBe(true)
  expect(hasFormatChoice('email')).toBe(false)
  expect(formatsOf('money').map((option) => option.key)).toEqual(['usd', 'eur', 'gbp', 'jpy'])
  expect(defaultFormat('money')).toBe('usd')
  expect(defaultFormat('email')).toBeNull()
  expect(formatKey('money', 'eur')).toBe('eur')
  expect(formatKey('money', 'bitcoin')).toBe('usd')
  expect(formatKey('email', 'usd')).toBeNull()
})

test('read-only types are the ones the app fills in', () => {
  for (const type of ['formula', 'auto_number', 'created_time', 'updated_time'] as const) expect(isReadOnly(type)).toBe(true)
  for (const type of ['text', 'money', 'person', 'single_select'] as const) expect(isReadOnly(type)).toBe(false)
  expect(isSummarizable('money')).toBe(true)
  expect(isSummarizable('email')).toBe(false)
})

test('a column header names the type and any format other than the default', () => {
  expect(fieldTypeText({ data_type: 'money', display_format: 'eur' })).toBe('Money · Euros')
  expect(fieldTypeText({ data_type: 'money', display_format: 'usd' })).toBe('Money')
  expect(fieldTypeText({ data_type: 'money', display_format: null })).toBe('Money')
  expect(fieldTypeText({ data_type: 'email' })).toBe('Email')
})

test('displayValue prints the format, else the value as it is', () => {
  const people = new Map([[7, 'Ada Lovelace']])
  expect(displayValue({ data_type: 'money', display_format: 'eur' }, 1250)).toBe('€1,250.00')
  expect(displayValue({ data_type: 'integer', display_format: 'plain' }, 1250)).toBe('1250')
  expect(displayValue({ data_type: 'boolean' }, false)).toBe('No')
  expect(displayValue({ data_type: 'multi_select' }, ['a', 'b'])).toBe('a, b')
  expect(displayValue({ data_type: 'person' }, 7, { people })).toBe('Ada Lovelace')
  expect(displayValue({ data_type: 'person' }, 8, { people })).toBe('Member #8')
  expect(displayValue({ data_type: 'relation' }, 3)).toBe('Record #3')
  expect(displayValue({ data_type: 'money' }, null)).toBe('')
  expect(displayValue({ data_type: 'text' }, 'hello')).toBe('hello')
})

test('a value that does not fit gets a message naming the field; blanks are fine', () => {
  expect(valueProblem({ name: 'Email', data_type: 'email' }, 'ada@')).toBe('Email needs an email address like name@example.com.')
  expect(valueProblem({ name: 'Email', data_type: 'email' }, 'ada@example.com')).toBeNull()
  expect(valueProblem({ name: 'Email', data_type: 'email' }, '')).toBeNull()
  expect(valueProblem({ name: 'Labels', data_type: 'multi_select', options: ['a'] }, ['b'])).toBe('Labels needs choices from the field’s list.')
  expect(valueProblem({ name: 'Notes', data_type: 'text' }, 5)).toBeNull()
})

test('choices need one to thirty short entries', () => {
  expect(choicesProblem([])).toBe('Add at least one choice.')
  expect(choicesProblem(['  ', ''])).toBe('Add at least one choice.')
  expect(choicesProblem(['Open', 'Done'])).toBeNull()
  expect(choicesProblem(Array.from({ length: 31 }, (_, i) => String(i)))).toMatch(/at most 30/)
  expect(choicesProblem(['x'.repeat(41)])).toMatch(/at most 40/)
})

test('a record is saved as plain values, without the fields the app fills in, and checked as a whole', () => {
  const fields = [
    { id: 1, name: 'Phone', data_type: 'phone' as const, relation_table_id: null },
    { id: 2, name: 'Price', data_type: 'money' as const, relation_table_id: null },
    { id: 3, name: 'No.', data_type: 'auto_number' as const, relation_table_id: null },
    { id: 4, name: 'Total', data_type: 'formula' as const, relation_table_id: null },
  ]
  const plain = plainValues(fields, { 1: '(555) 123-4567', 2: '$1,250.00', 3: 7, 4: 10 })
  expect(plain).toEqual({ 1: '5551234567', 2: 1250 })
  expect(recordProblem(fields, plain)).toBeNull()
  expect(recordProblem(fields, { 1: '5551234567', 2: 12.345 })).toBe('Price needs an amount with at most two decimals.')
  expect(recordProblem(fields, { 1: '' })).toBeNull()
})

test('a format is listed with how it reads', () => {
  expect(formatsOf('money').map(formatChoiceLabel)).toEqual(['US dollars: $1,250.00', 'Euros: €1,250.00', 'Pounds: £1,250.00', 'Yen: ¥1,250'])
})
