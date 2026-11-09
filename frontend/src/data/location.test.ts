import type { TableData, TableField } from '@/api/tables'
import { defaultLocationField, locationFields, mapPins, pinDetails, recordLabel } from './location'

const field = (id: number, name: string, data_type: TableField['data_type'] = 'text'): TableField =>
  ({ id, name, data_type, relation_table_id: null })
const name = field(1, 'Name')
const where = field(2, 'Location')
const notes = field(3, 'Notes')
const open = field(4, 'Open', 'boolean')
const seats = field(5, 'Seats', 'integer')

const data: TableData = {
  fields: [name, where, notes, open, seats],
  records: [
    { id: 10, values: { 1: 'Cafe Paris', 2: '48.8584, 2.2945', 3: 'Corner table', 4: true, 5: 12 } },
    { id: 11, values: { 1: 'Tokyo Bar', 2: '35.6762 139.6503', 4: false } },
    { id: 12, values: { 1: 'Nowhere', 2: 'Somewhere nice' } },
    { id: 13, values: { 2: '' } },
    { id: 14, values: { 3: 'Just notes' } },
  ],
}

describe('locationFields', () => {
  test('are the text fields', () => {
    expect(locationFields(data.fields).map((f) => f.name)).toEqual(['Name', 'Location', 'Notes'])
  })
})

describe('defaultLocationField', () => {
  test('is the text field with the most coordinates', () => {
    expect(defaultLocationField(data)).toBe(where)
  })

  test('falls back to a field named like a location, then the first text field', () => {
    const empty = { ...data, records: [] }
    expect(defaultLocationField(empty)).toBe(where)
    expect(defaultLocationField({ fields: [name, notes], records: [] })).toBe(name)
  })

  test('is null without a text field', () => {
    expect(defaultLocationField({ fields: [open, seats], records: [] })).toBeNull()
  })
})

describe('recordLabel', () => {
  test('is the name or title field, then any other text, then the record number', () => {
    expect(recordLabel(data.records[0], data.fields, where)).toBe('Cafe Paris')
    expect(recordLabel(data.records[4], data.fields, where)).toBe('Just notes')
    expect(recordLabel(data.records[3], data.fields, where)).toBe('Record #13')
  })

  test('never uses the location itself', () => {
    expect(recordLabel({ id: 20, values: { 2: '1, 2' } }, data.fields, where)).toBe('Record #20')
  })
})

describe('mapPins', () => {
  test('splits records into placed and not placed', () => {
    const { pins, unplotted } = mapPins(data, where)
    expect(pins.map((p) => [p.id, p.label, p.position])).toEqual([
      [10, 'Cafe Paris', { lat: 48.8584, lng: 2.2945 }],
      [11, 'Tokyo Bar', { lat: 35.6762, lng: 139.6503 }],
    ])
    expect(unplotted).toEqual([
      { id: 12, label: 'Nowhere', value: 'Somewhere nice' },
      { id: 13, label: 'Record #13', value: '' },
      { id: 14, label: 'Just notes', value: '' },
    ])
  })

  test('uses whichever field it is given', () => {
    expect(mapPins(data, notes).pins).toHaveLength(0)
    expect(mapPins(data, notes).unplotted).toHaveLength(5)
  })

  test('has nothing to plot without a location field', () => {
    expect(mapPins(data, null)).toEqual({ pins: [], unplotted: [] })
  })
})

describe('pinDetails', () => {
  test('lists the filled-in values except the location, with readable booleans', () => {
    expect(pinDetails(data.records[0], data.fields, where)).toEqual([
      { name: 'Name', value: 'Cafe Paris' },
      { name: 'Notes', value: 'Corner table' },
      { name: 'Open', value: 'Yes' },
      { name: 'Seats', value: '12' },
    ])
    expect(pinDetails(data.records[1], data.fields, where)).toEqual([
      { name: 'Name', value: 'Tokyo Bar' },
      { name: 'Open', value: 'No' },
    ])
  })

  test('names related records by number', () => {
    const link = { ...field(6, 'Owner', 'relation'), relation_table_id: 9 }
    expect(pinDetails({ id: 1, values: { 6: 33 } }, [link], where)).toEqual([{ name: 'Owner', value: 'Record #33' }])
  })

  test('writes values in their field format and names people', () => {
    const price = { ...field(7, 'Price', 'money'), display_format: 'eur' }
    const lead = field(8, 'Lead', 'person')
    const labels = field(9, 'Labels', 'multi_select')
    const record = { id: 1, values: { 7: 1250, 8: 3, 9: ['a', 'b'] } }
    expect(pinDetails(record, [price, lead, labels], where, { people: new Map([[3, 'Ada Lovelace']]) })).toEqual([
      { name: 'Price', value: '€1,250.00' },
      { name: 'Lead', value: 'Ada Lovelace' },
      { name: 'Labels', value: 'a, b' },
    ])
    expect(pinDetails(record, [lead], where)).toEqual([{ name: 'Lead', value: 'Member #3' }])
  })
})
