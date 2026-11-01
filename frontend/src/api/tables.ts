import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export type DataType = 'text' | 'integer' | 'number' | 'boolean' | 'date' | 'datetime' | 'relation' | 'mirror'
// A mirror (data_type 'mirror') shows `mirror_field_id` of the collection that its relation field `mirror_relation_field_id` links to.
export interface TableField { id: number; name: string; data_type: DataType; relation_table_id: number | null; mirror_relation_field_id?: number | null; mirror_field_id?: number | null }
// `mirrors` holds each mirror field's values for the record, a list per field id (empty when nothing is linked).
export interface TableRecord { id: number; values: Record<string, string | number | boolean | null>; mirrors?: Record<string, Array<string | number | boolean>> }
export interface TableData { fields: TableField[]; records: TableRecord[] }
export const tableQuery = (id: number) => ({
  queryKey: ['table', id],
  queryFn: () => api.get<TableData>(`/api/v1/tables/${id}`).then(r => r.data),
})
export function useTable(id: number) { return useQuery(tableQuery(id)) }
export function useEditTable(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ path, method, data }: { path: string; method: 'post' | 'patch' | 'delete'; data?: unknown }) =>
      api.request<TableData>({ url: `/api/v1/tables/${id}/${path}`, method, data }).then(r => r.data),
    onSuccess: data => {
      qc.setQueryData(['table', id], data)
      qc.invalidateQueries({ queryKey: ['table'] })
      qc.invalidateQueries({ queryKey: ['workspace'] })
      qc.invalidateQueries({ queryKey: ['folder-contents'] })
    },
  })
}
export { errorMessage } from '@/util/errorMessage'
