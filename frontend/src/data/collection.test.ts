import { holdsMany, linkedIds, linkedLabels, pickedIds, recordLabel } from './collection'
import type { TableData, TableField } from '@/api/tables'

const fields: TableField[] = [
  { id: 1, name: 'Number', data_type: 'integer', relation_table_id: null },
  { id: 2, name: 'Title', data_type: 'text', relation_table_id: null },
]
const target: TableData = { fields, records: [{ id: 5, values: { 2: 'Intro' } }, { id: 6, values: {} }] }

test('a record is named by its first text value, or its number', () => {
  expect(recordLabel(fields, target.records[0])).toBe('#5 · Intro')
  expect(recordLabel(fields, target.records[1])).toBe('#6')
  expect(recordLabel([fields[0]], target.records[0])).toBe('#5')
})

test('relation values read the same whether one or many', () => {
  expect(linkedIds([1, 2])).toEqual([1, 2])
  expect(linkedIds(3)).toEqual([3])
  expect(linkedIds(null)).toEqual([])
  expect(linkedIds(undefined)).toEqual([])
})

test('picked options become ids', () => {
  expect(pickedIds([{ selected: true, value: '4' }, { selected: false, value: '5' }, { selected: true, value: '6' }])).toEqual([4, 6])
})

test('linked labels skip missing records and a missing target', () => {
  expect(linkedLabels(target, [5, 99, 6])).toEqual(['#5 · Intro', '#6'])
  expect(linkedLabels(undefined, [5])).toEqual([])
})

test('only relation fields marked many hold many', () => {
  expect(holdsMany({ data_type: 'relation', allow_many: true })).toBe(true)
  expect(holdsMany({ data_type: 'relation', allow_many: false })).toBe(false)
  expect(holdsMany({ data_type: 'text', allow_many: true })).toBe(false)
})
