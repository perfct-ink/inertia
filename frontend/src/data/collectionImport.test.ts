import type { ImportColumn, ImportPreview } from '@/api/collectionImport'
import { SKIP, chosenColumns, columnNote, importTypeLabel, initialChoices, recordCount, typeOptions } from './collectionImport'

const column = (over: Partial<ImportColumn>): ImportColumn => ({ key: 'name', data_type: 'text', field_id: null, field_name: null, importable: true, ...over })
const preview = (columns: ImportColumn[]): ImportPreview => ({ row_count: 2, columns, skipped_keys: [], types: ['text', 'integer', 'date'] })

test('type labels read as words, for types the server adds later too', () => {
  expect(importTypeLabel('text')).toBe('Text')
  expect(importTypeLabel('datetime')).toBe('Date and time')
  expect(importTypeLabel('long_text')).toBe('Long text')
})

test('a new key can become any type the server offers, or be left out', () => {
  const options = typeOptions(column({}), ['text', 'integer', 'date'])
  expect(options.map((o) => o.value)).toEqual(['text', 'integer', 'date', SKIP])
})

test('a key that matches a field keeps its type or is left out', () => {
  const options = typeOptions(column({ field_id: 4, field_name: 'Age', data_type: 'integer' }), ['text', 'integer'])
  expect(options).toEqual([{ value: 'integer', label: 'Integer (existing field)' }, { value: SKIP, label: "Don't import" }])
})

test('a key that matches a field that cannot take values can only be left out', () => {
  const options = typeOptions(column({ field_id: 4, data_type: 'relation', importable: false }), ['text'])
  expect(options.map((o) => o.value)).toEqual([SKIP])
})

test('every importable key starts as its guess and the others as left out', () => {
  const result = preview([column({ key: 'a', data_type: 'integer' }), column({ key: 'b', data_type: 'formula', field_id: 2, importable: false })])
  expect(initialChoices(result)).toEqual({ a: 'integer', b: SKIP })
})

test('only the keys not left out are sent, with the chosen types', () => {
  const result = preview([column({ key: 'a' }), column({ key: 'b' }), column({ key: 'c', field_id: 3, data_type: 'relation', importable: false })])
  expect(chosenColumns(result, { a: 'integer', b: SKIP, c: 'relation' })).toEqual([{ key: 'a', data_type: 'integer' }])
})

test('the counts and notes read plainly', () => {
  expect(recordCount(1)).toBe('1 record')
  expect(recordCount(3)).toBe('3 records')
  expect(columnNote(column({}))).toBe('New field')
  expect(columnNote(column({ key: 'age', field_id: 1, field_name: 'Age', data_type: 'integer' }))).toBe('Existing field “Age”')
  expect(columnNote(column({ key: 'Age', field_id: 1, field_name: 'Age', data_type: 'integer' }))).toBe('Existing field')
  expect(columnNote(column({ field_id: 1, data_type: 'relation', importable: false }))).toBe("Can't import into a relation field")
})
