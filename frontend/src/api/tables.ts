import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export type DataType = 'text' | 'integer' | 'number' | 'boolean' | 'date' | 'datetime' | 'relation'
export interface TableField { id: number; name: string; data_type: DataType; relation_table_id: number | null; allow_many?: boolean }
// A cell is a scalar, or the list of linked record ids for a "many" relation.
export type CellValue = string | number | boolean | number[] | null
// A record in another collection that links to this one (shown read-only).
export interface ReverseLink { id: number; label: string }
export interface ReverseField { id: number; name: string; source_table_id: number }
export interface TableRecord { id: number; values: Record<string, CellValue>; reverse?: Record<string, ReverseLink[]> }
export interface TableData { fields: TableField[]; reverse_fields?: ReverseField[]; records: TableRecord[] }
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
