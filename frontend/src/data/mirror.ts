import type { FieldDataType, TableField } from '@/api/tables'
import { displayValue, type DisplayContext } from './fieldType'

// Mirror fields in collections: a mirror reads through one relation (connect)
// field of its own collection and shows one field of the collection that
// field links to. Mirrors TableField and TableMirrors in the backend.
export type MirroredValue = string | number | boolean
export interface LinkedTable { fields: TableField[] }

// A mirror shows a plain value the linked record holds itself: not a link,
// another mirror, a formula (worked out in the browser), uploaded files (lists
// of file ids) or a created/updated time (read from the record, not a cell).
// Mirrors TableField::UNMIRRORABLE_TYPES.
const UNMIRRORABLE_TYPES: FieldDataType[] = ['relation', 'mirror', 'formula', 'file', 'files', 'created_time', 'updated_time']

export const relationFields = (fields: TableField[]): TableField[] => fields.filter(f => f.data_type === 'relation')

// The fields of the linked collection a mirror can show.
export const mirrorSources = (linked?: LinkedTable): TableField[] =>
  (linked?.fields ?? []).filter(f => !UNMIRRORABLE_TYPES.includes(f.data_type))

// The field of the linked collection that a mirror shows, once that collection
// has loaded.
export function mirrorSource(mirror: TableField, fields: TableField[], linked: Map<number, LinkedTable>): TableField | undefined {
  const via = fields.find(f => f.id === mirror.mirror_relation_field_id)
  const table = via?.relation_table_id ? linked.get(via.relation_table_id) : undefined
  return table?.fields.find(f => f.id === mirror.mirror_field_id)
}

// "Companies · Name": the collection a mirror reads from and the field it
// shows, for the column header.
export function mirrorSummary(mirror: TableField, fields: TableField[], linked: Map<number, LinkedTable>, titleOf: (tableId: number) => string | undefined): string {
  const via = fields.find(f => f.id === mirror.mirror_relation_field_id)
  const collection = (via?.relation_table_id && titleOf(via.relation_table_id)) || 'Collection'
  return `${collection} · ${mirrorSource(mirror, fields, linked)?.name ?? 'Loading…'}`
}

// The cell text for one record: its mirrored values (a list, empty when
// nothing is linked), each shown as the shown field shows it (money in its
// currency, a person by name), joined with commas.
export const mirrorText = (values: MirroredValue[] | undefined, source?: Pick<TableField, 'data_type' | 'display_format'>, context: DisplayContext = {}): string =>
  (values ?? []).map(value => displayValue(source ?? { data_type: 'text' }, value, context)).join(', ')

// The field form's two choices, as the API takes them.
export const mirrorParams = (relationFieldId: string, sourceFieldId: string) =>
  ({ mirror_relation_field_id: Number(relationFieldId), mirror_field_id: Number(sourceFieldId) })
