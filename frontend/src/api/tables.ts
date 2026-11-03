import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { ApiResource } from './base'

export type DataType = 'text' | 'integer' | 'number' | 'boolean' | 'date' | 'datetime' | 'relation' | 'file' | 'files'
// A formula field holds no values of its own: the editor works it out from the record's other fields.
export type FieldDataType = DataType | 'formula'
// `geocode` marks a text field whose addresses the server turns into places (see docs/features/collection_map_view.md).
export interface TableField { id: number; name: string; data_type: FieldDataType; relation_table_id: number | null; formula?: string | null; geocode?: boolean }
// What the server's place search made of a cell's text: a place, no match, or an error. The text itself is never changed.
export interface PlaceResult { status: 'found' | 'not_found' | 'failed'; latitude?: number; longitude?: number; name?: string | null; error?: string }
// `places` is by field id; `geocoding` says whether the server has a place search to use at all.
export interface TableRecord { id: number; values: Record<string, string | number | boolean | number[] | null>; places?: Record<string, PlaceResult> }
export interface TableData { fields: TableField[]; records: TableRecord[]; geocoding?: boolean }

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
export { errorMessage } from '@/util/errorMessage'
