import type { TableData, TableField } from '@/api/tables'
import { parseCsv, toCsv } from '@/util/csv'
import {
  MAX_IMPORT_CELLS, MAX_IMPORT_ROWS, collectionToCsvRows, convertCell, guessFieldType,
  normalizeDateTime, planImport, suggestTargets, type ColumnTarget,
} from './collectionCsv'

const fields: TableField[] = [
  { id: 1, name: 'Name', data_type: 'text', relation_table_id: null },
  { id: 2, name: 'Age', data_type: 'integer', relation_table_id: null },
  { id: 3, name: 'Active', data_type: 'boolean', relation_table_id: null },
  { id: 4, name: 'Company', data_type: 'relation', relation_table_id: 9 },
]

describe('collectionToCsvRows', () => {
  const data: TableData = {
    fields,
    records: [
      { id: 10, values: { 1: 'Ada', 2: 36, 3: true, 4: 7 } },
      { id: 11, values: { 1: '=cmd()', 3: false } },
    ],
  }

  it('writes a header, then each record with its id and a blank for a missing value', () => {
    expect(collectionToCsvRows(data)).toEqual([
      ['Record ID', 'Name', 'Age', 'Active', 'Company'],
      [10, 'Ada', 36, true, 7],
      [11, "'=cmd()", undefined, false, undefined],
    ])
  })

  it('serialises to text a spreadsheet can open', () => {
    expect(toCsv(collectionToCsvRows(data)).split('\r\n')).toEqual([
      'Record ID,Name,Age,Active,Company',
      '10,Ada,36,true,7',
      "11,'=cmd(),,false,",
    ])
  })

  it('writes only the header for an empty collection', () => {
    expect(collectionToCsvRows({ fields: [fields[0]], records: [] })).toEqual([['Record ID', 'Name']])
  })
})

describe('convertCell', () => {
  it('treats blank cells as no value for every type', () => {
    expect(convertCell('  ', 'integer')).toEqual({ ok: true, value: null })
    expect(convertCell('', 'text')).toEqual({ ok: true, value: null })
  })

  it('reads whole numbers and numbers', () => {
    expect(convertCell('42', 'integer')).toEqual({ ok: true, value: 42 })
    expect(convertCell('+007', 'integer')).toEqual({ ok: true, value: 7 })
    expect(convertCell('1.5', 'integer').ok).toBe(false)
    expect(convertCell('-2.50', 'number')).toEqual({ ok: true, value: -2.5 })
    expect(convertCell('.5', 'number')).toEqual({ ok: true, value: 0.5 })
    expect(convertCell('1,000', 'number').ok).toBe(false)
    expect(convertCell('abc', 'number')).toEqual({ ok: false, message: '“abc” is not a number' })
  })

  it('reads booleans', () => {
    expect(convertCell('TRUE', 'boolean')).toEqual({ ok: true, value: true })
    expect(convertCell('no', 'boolean')).toEqual({ ok: true, value: false })
    expect(convertCell('maybe', 'boolean').ok).toBe(false)
  })

  it('reads dates and datetimes, assuming UTC when there is no zone', () => {
    expect(convertCell('2026-11-01', 'date')).toEqual({ ok: true, value: '2026-11-01' })
    expect(convertCell('2026-02-30', 'date').ok).toBe(false)
    expect(convertCell('11/01/2026', 'date').ok).toBe(false)
    expect(convertCell('2026-11-01 09:30', 'datetime')).toEqual({ ok: true, value: '2026-11-01T09:30:00Z' })
    expect(convertCell('2026-11-01T09:30:15.5+02:00', 'datetime')).toEqual({ ok: true, value: '2026-11-01T09:30:15.5+02:00' })
    expect(convertCell('2026-11-01T25:00', 'datetime').ok).toBe(false)
  })

  it('reads a relation as a record id, with or without the #', () => {
    expect(convertCell('12', 'relation')).toEqual({ ok: true, value: 12 })
    expect(convertCell('#12', 'relation')).toEqual({ ok: true, value: 12 })
    expect(convertCell('Acme', 'relation').ok).toBe(false)
  })

  it('keeps text exactly as written', () => {
    expect(convertCell(' padded ', 'text')).toEqual({ ok: true, value: ' padded ' })
  })

  it('passes types it does not know through as text', () => {
    expect(convertCell('https://example.com', 'url' as never)).toEqual({ ok: true, value: 'https://example.com' })
  })
})

describe('normalizeDateTime', () => {
  it('fills in seconds and the zone', () => {
    expect(normalizeDateTime('2026-11-01T09:30')).toBe('2026-11-01T09:30:00Z')
    expect(normalizeDateTime('2026-11-01 09:30:05 z')).toBe('2026-11-01T09:30:05Z')
    expect(normalizeDateTime('2026-11-01')).toBeNull()
  })
})

describe('guessFieldType', () => {
  it('picks the narrowest type that fits every value', () => {
    expect(guessFieldType(['true', 'False', ''])).toBe('boolean')
    expect(guessFieldType(['1', '-20', '3'])).toBe('integer')
    expect(guessFieldType(['1', '2.5'])).toBe('number')
    expect(guessFieldType(['2026-11-01', '2026-12-31'])).toBe('date')
    expect(guessFieldType(['2026-11-01 10:00', '2026-12-31T08:00:00Z'])).toBe('datetime')
  })

  it('falls back to text', () => {
    expect(guessFieldType([])).toBe('text')
    expect(guessFieldType(['', ' '])).toBe('text')
    expect(guessFieldType(['1', 'two'])).toBe('text')
    expect(guessFieldType(['02134', '10001'])).toBe('text')
    expect(guessFieldType(['9007199254740993'])).toBe('text')
    expect(guessFieldType(['2026-13-45'])).toBe('text')
  })
})

describe('suggestTargets', () => {
  it('maps known headers to fields, skips Record ID, and makes new fields for the rest', () => {
    const rows = parseCsv('Record ID,name,AGE,City,Founded\n1,Ada,36,Paris,2020-01-02\n2,Bo,41,Rome,2021-05-06')
    expect(suggestTargets(rows, fields)).toEqual([
      { kind: 'skip' },
      { kind: 'field', fieldId: 1 },
      { kind: 'field', fieldId: 2 },
      { kind: 'new', name: 'City', dataType: 'text' },
      { kind: 'new', name: 'Founded', dataType: 'date' },
    ])
  })

  it('skips a repeated header and names blank headers', () => {
    const rows = parseCsv('Name,Name,,City,city\nAda,Ada,1,Paris,Paris')
    expect(suggestTargets(rows, fields)).toEqual([
      { kind: 'field', fieldId: 1 },
      { kind: 'skip' },
      { kind: 'new', name: 'Column 3', dataType: 'integer' },
      { kind: 'new', name: 'City', dataType: 'text' },
      { kind: 'skip' },
    ])
  })

  it('returns nothing for an empty file', () => {
    expect(suggestTargets([], fields)).toEqual([])
  })
})

describe('planImport', () => {
  const targets: ColumnTarget[] = [
    { kind: 'field', fieldId: 1 },
    { kind: 'field', fieldId: 2 },
    { kind: 'new', name: 'City', dataType: 'text' },
  ]

  it('builds the request body with existing and new columns', () => {
    const rows = parseCsv('Name,Age,City\nAda,36,Paris\nBo,,Rome')
    const plan = planImport(rows, targets, fields)
    expect(plan.issues).toEqual([])
    expect(plan.imported).toBe(2)
    expect(plan.payload).toEqual({
      columns: [{ field_id: 1 }, { field_id: 2 }, { name: 'City', data_type: 'text' }],
      rows: [['Ada', 36, 'Paris'], ['Bo', '', 'Rome']],
    })
  })

  it('leaves out skipped columns and rows that are empty in the imported columns', () => {
    const rows = parseCsv('Name,Age,Notes\nAda,36,x\n,,only a note\n,,')
    const plan = planImport(rows, [{ kind: 'field', fieldId: 1 }, { kind: 'field', fieldId: 2 }, { kind: 'skip' }], fields)
    expect(plan.payload?.rows).toEqual([['Ada', 36]])
    expect(plan.skipped).toBe(2)
    expect(plan.imported).toBe(1)
  })

  it('reports every bad value with a spreadsheet row number, and sends nothing', () => {
    const rows = parseCsv('Name,Age,City\nAda,36,Paris\nBo,old,Rome\nCy,1.5,Oslo')
    const plan = planImport(rows, targets, fields)
    expect(plan.payload).toBeNull()
    expect(plan.issues).toEqual([
      { row: 3, message: 'Row 3, “Age”: “old” is not a whole number' },
      { row: 4, message: 'Row 4, “Age”: “1.5” is not a whole number' },
    ])
  })

  it('rejects a file with no records or no chosen columns', () => {
    expect(planImport(parseCsv('Name,Age'), targets, fields).issues[0].message).toContain('no records')
    expect(planImport(parseCsv('Name\nAda'), [{ kind: 'skip' }], fields).issues[0].message).toContain('at least one column')
    expect(planImport([], [], fields).payload).toBeNull()
  })

  it('rejects two columns for one field, and a new field that clashes with an existing name', () => {
    const rows = parseCsv('A,B\n1,2')
    expect(planImport(rows, [{ kind: 'field', fieldId: 2 }, { kind: 'field', fieldId: 2 }], fields).issues[0].message).toContain('More than one column')
    expect(planImport(rows, [{ kind: 'new', name: ' name ', dataType: 'text' }, { kind: 'skip' }], fields).issues[0].message).toContain('already exists')
    expect(planImport(rows, [{ kind: 'new', name: 'X', dataType: 'text' }, { kind: 'new', name: 'x', dataType: 'text' }], fields).issues[0].message).toContain('already exists')
    expect(planImport(rows, [{ kind: 'new', name: '  ', dataType: 'text' }, { kind: 'skip' }], fields).issues[0].message).toContain('needs a name')
  })

  it('flags cells beyond the header row', () => {
    const plan = planImport(parseCsv('Name\nAda,surprise'), [{ kind: 'field', fieldId: 1 }], fields)
    expect(plan.payload).toBeNull()
    expect(plan.issues[0].message).toBe('Row 2 has more cells than the header row.')
    expect(planImport(parseCsv('Name\nAda,'), [{ kind: 'field', fieldId: 1 }], fields).payload?.rows).toEqual([['Ada']])
  })

  it('enforces the row and cell limits', () => {
    const many = ['Name', ...Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `r${i}`)].map((cell) => [cell])
    expect(planImport(many, [{ kind: 'field', fieldId: 1 }], fields).issues[0].message).toContain(`at most ${MAX_IMPORT_ROWS} records`)
    const columnCount = MAX_IMPORT_CELLS / MAX_IMPORT_ROWS + 1
    const wide = [Array.from({ length: columnCount }, (_, i) => `c${i}`), ...Array.from({ length: MAX_IMPORT_ROWS }, () => Array.from({ length: columnCount }, () => 'x'))]
    const wideTargets = wide[0].map((name): ColumnTarget => ({ kind: 'new', name, dataType: 'text' }))
    expect(planImport(wide, wideTargets, fields).issues[0].message).toContain(`at most ${MAX_IMPORT_CELLS} cells`)
  })

  it('imports what it exported', () => {
    const data: TableData = { fields, records: [{ id: 1, values: { 1: 'Ada', 2: 36, 3: true, 4: 7 } }, { id: 2, values: { 1: 'Bo' } }] }
    const rows = parseCsv(toCsv(collectionToCsvRows(data)))
    const plan = planImport(rows, suggestTargets(rows, fields), fields)
    expect(plan.issues).toEqual([])
    expect(plan.payload?.columns).toEqual([{ field_id: 1 }, { field_id: 2 }, { field_id: 3 }, { field_id: 4 }])
    expect(plan.payload?.rows).toEqual([['Ada', 36, true, 7], ['Bo', '', '', '']])
  })
})
