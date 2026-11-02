import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { ApiResource } from './base'

export type DataType = 'text' | 'integer' | 'number' | 'boolean' | 'date' | 'datetime' | 'relation'
// A formula field holds no values of its own: the editor works it out from the record's other fields.
export type FieldDataType = DataType | 'formula'
export interface TableField { id: number; name: string; data_type: FieldDataType; relation_table_id: number | null; formula?: string | null }
export interface TableRecord { id: number; values: Record<string, string | number | boolean | null> }
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
export { errorMessage } from '@/util/errorMessage'
