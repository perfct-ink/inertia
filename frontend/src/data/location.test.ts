import type { PlaceResult, TableData, TableField, TableRecord } from '@/api/tables'
import { defaultLocationField, locationFields, mapPins, pinDetails, placeOf, placeProblem, recordLabel } from './location'

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
})

describe('places found for addresses', () => {
  const address: TableField = { ...field(7, 'Address'), geocode: true }
  const found: PlaceResult = { status: 'found', latitude: 48.8583, longitude: 2.2945, name: 'Eiffel Tower, Paris' }
  const records: TableRecord[] = [
    { id: 30, values: { 1: 'Eiffel', 7: 'Eiffel Tower, Paris' }, places: { 7: found } },
    { id: 31, values: { 1: 'Typed', 7: '35.6762, 139.6503' }, places: { 7: { status: 'not_found' } } },
    { id: 32, values: { 1: 'Lost', 7: 'Nowhereville' }, places: { 7: { status: 'not_found' } } },
    { id: 33, values: { 1: 'Down', 7: 'Louvre' }, places: { 7: { status: 'failed', error: 'The place search is not available right now.' } } },
    { id: 34, values: { 1: 'Failed quietly', 7: 'Orsay' }, places: { 7: { status: 'failed' } } },
    { id: 35, values: { 1: 'Never looked up', 7: 'Colosseum' } },
    { id: 36, values: { 1: 'Broken', 7: 'Pantheon' }, places: { 7: { status: 'found' } } },
  ]
  const places: TableData = { fields: [name, address], records }

  test('placeOf prefers typed coordinates, then the place the server found', () => {
    expect(placeOf(records[0], address)).toEqual({ position: { lat: 48.8583, lng: 2.2945 }, matched: 'Eiffel Tower, Paris' })
    expect(placeOf(records[1], address)).toEqual({ position: { lat: 35.6762, lng: 139.6503 } })
  })

  test('placeOf is null without a usable place', () => {
    for (const record of records.slice(2)) expect(placeOf(record, address)).toBeNull()
  })

  test('placeProblem explains no match and failures, and says nothing when nothing is wrong', () => {
    expect(placeProblem({ status: 'not_found' })).toBe('No place found for this text.')
    expect(placeProblem({ status: 'failed', error: 'Too busy' })).toBe('Too busy')
    expect(placeProblem({ status: 'failed' })).toBe('The place could not be looked up.')
    expect(placeProblem(found)).toBeNull()
    expect(placeProblem(undefined)).toBeNull()
  })

  test('mapPins plots found addresses and says why the others are missing', () => {
    const { pins, unplotted } = mapPins(places, address)
    expect(pins.map((p) => [p.id, p.position, p.matched])).toEqual([
      [30, { lat: 48.8583, lng: 2.2945 }, 'Eiffel Tower, Paris'],
      [31, { lat: 35.6762, lng: 139.6503 }, undefined],
    ])
    expect(unplotted).toEqual([
      { id: 32, label: 'Lost', value: 'Nowhereville', problem: 'No place found for this text.' },
      { id: 33, label: 'Down', value: 'Louvre', problem: 'The place search is not available right now.' },
      { id: 34, label: 'Failed quietly', value: 'Orsay', problem: 'The place could not be looked up.' },
      { id: 35, label: 'Never looked up', value: 'Colosseum' },
      { id: 36, label: 'Broken', value: 'Pantheon' },
    ])
  })

  test('the map opens on the field that has places, even when they are addresses', () => {
    const typed = field(8, 'Notes')
    expect(defaultLocationField({ fields: [typed, address], records })).toBe(address)
  })

  test('with nothing placed yet it prefers a field that looks addresses up', () => {
    expect(defaultLocationField({ fields: [name, address], records: [] })).toBe(address)
    expect(defaultLocationField({ fields: [name, where, address], records: [] })).toBe(address)
  })
})
