import type { TableField } from '@/api/tables'
import { formatMirrorValue, mirrorParams, mirrorSource, mirrorSources, mirrorSummary, mirrorText, relationFields } from './mirror'

const field = (id: number, name: string, data_type: TableField['data_type'], extra: Partial<TableField> = {}): TableField =>
  ({ id, name, data_type, relation_table_id: null, mirror_relation_field_id: null, mirror_field_id: null, ...extra })

const company = field(1, 'Company', 'relation', { relation_table_id: 9 })
const mirror = field(3, 'Company name', 'mirror', { mirror_relation_field_id: 1, mirror_field_id: 20 })
const fields = [company, field(2, 'Age', 'integer'), mirror]
const companies = { fields: [field(20, 'Name', 'text'), field(21, 'Founded', 'datetime'), field(22, 'Parent', 'relation', { relation_table_id: 9 }), field(23, 'Seen by', 'mirror')] }

test('only relation fields can be connected through', () => {
  expect(relationFields(fields).map(f => f.name)).toEqual(['Company'])
})

test('a mirror can show any field of the linked collection except a link or another mirror', () => {
  expect(mirrorSources(companies).map(f => f.name)).toEqual(['Name', 'Founded'])
  expect(mirrorSources(undefined)).toEqual([])
})

test('the shown field is found once the linked collection has loaded', () => {
  expect(mirrorSource(mirror, fields, new Map([[9, companies]]))?.name).toBe('Name')
  expect(mirrorSource(mirror, fields, new Map())).toBeUndefined()
  expect(mirrorSource(mirror, [field(2, 'Age', 'integer')], new Map([[9, companies]]))).toBeUndefined()
})

test('the header summary names the collection and the field, with a placeholder while loading', () => {
  const titleOf = (id: number) => (id === 9 ? 'Companies' : undefined)
  expect(mirrorSummary(mirror, fields, new Map([[9, companies]]), titleOf)).toBe('Companies · Name')
  expect(mirrorSummary(mirror, fields, new Map(), titleOf)).toBe('Companies · Loading…')
  expect(mirrorSummary(mirror, fields, new Map(), () => undefined)).toBe('Collection · Loading…')
})

test('values read like the editor shows them', () => {
  expect(formatMirrorValue('Acme')).toBe('Acme')
  expect(formatMirrorValue(0)).toBe('0')
  expect(formatMirrorValue(true)).toBe('True')
  expect(formatMirrorValue(false)).toBe('False')
  expect(formatMirrorValue('2026-10-04T10:30:00Z', 'datetime')).toBe('2026-10-04 10:30 UTC')
  expect(formatMirrorValue('not a time', 'datetime')).toBe('not a time')
  expect(formatMirrorValue('2026-10-04', 'date')).toBe('2026-10-04')
})

test('a record with nothing linked has no text, several values are comma separated', () => {
  expect(mirrorText(undefined)).toBe('')
  expect(mirrorText([])).toBe('')
  expect(mirrorText(['Acme', 'Globex'])).toBe('Acme, Globex')
  expect(mirrorText([false], 'boolean')).toBe('False')
})

test('the form choices become numeric ids for the API', () => {
  expect(mirrorParams('1', '20')).toEqual({ mirror_relation_field_id: 1, mirror_field_id: 20 })
})
