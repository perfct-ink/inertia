import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { ApiResource } from './base'

// What a field can hold, as the server stores it. Mirrors FieldType in
// backend/app/models/field_type.rb; data/fieldType.ts has the labels, formats and checks.
export type DataType =
  | 'text' | 'long_text' | 'integer' | 'number' | 'boolean' | 'date' | 'datetime'
  | 'email' | 'phone' | 'url' | 'username' | 'person_name' | 'alphanumeric' | 'color'
  | 'money' | 'mileage' | 'percent' | 'rating' | 'month' | 'year' | 'single_select' | 'multi_select'
  | 'person' | 'relation' | 'file' | 'files' | 'auto_number'
// A formula is worked out by the editor and a created or updated time is read
// from the record: none of them has a value of its own to type in.
// A mirror holds none either: it shows `mirror_field_id` of the Collection that its relation field `mirror_relation_field_id` links to.
export type FieldDataType = DataType | 'formula' | 'created_time' | 'updated_time' | 'mirror'
export interface TableField {
  id: number; name: string; data_type: FieldDataType; relation_table_id: number | null
  formula?: string | null; unit?: string | null
  // How the type's values are shown (a type with one way to show them has none), and a select's choices.
  display_format?: string | null; options?: string[] | null
  mirror_relation_field_id?: number | null; mirror_field_id?: number | null
}
// Values are plain (a phone as its digits, money as a number); `display` has the
// text for the ones whose format changes how they read, by field id.
export type CellValue = string | number | boolean | number[] | string[] | null
// `mirrors` holds each mirror field's values for the record, a list per field id (empty when nothing is linked).
export interface TableRecord { id: number; values: Record<string, CellValue>; display?: Record<string, string>; mirrors?: Record<string, Array<string | number | boolean>> }
export interface TableData { fields: TableField[]; records: TableRecord[] }

export class TableApi extends ApiResource<TableData> {
  constructor() {
    super('/api/v1/tables', 'table', 'table')
  }

  // Fields and records are edited through the table, and each call answers with the whole table.
  edit(id: number, path: string, method: 'post' | 'patch' | 'delete', data?: unknown) {
    return api.request<TableData>({ url: `${this.url(id)}/${path}`, method, data }).then((r) => r.data)
  }
}

export const tableApi = new TableApi()

export const tableQuery = (id: number) => ({
  queryKey: [tableApi.queryKey, id],
  queryFn: () => tableApi.find(id),
})
export function useTable(id: number) { return useQuery(tableQuery(id)) }
export function useEditTable(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ path, method, data }: { path: string; method: 'post' | 'patch' | 'delete'; data?: unknown }) =>
      tableApi.edit(id, path, method, data),
    onSuccess: data => {
      qc.setQueryData(['table', id], data)
      qc.invalidateQueries({ queryKey: ['table'] })
      qc.invalidateQueries({ queryKey: ['workspace'] })
      qc.invalidateQueries({ queryKey: ['folder-contents'] })
    },
  })
}
