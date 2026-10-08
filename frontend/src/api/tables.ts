import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import api from '@/lib/api'

export type DataType = 'text' | 'integer' | 'number' | 'boolean' | 'date' | 'datetime' | 'relation'
export interface TableField { id: number; name: string; data_type: DataType; relation_table_id: number | null }
export interface TableRecord { id: number; values: Record<string, string | number | boolean | null> }
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
export function errorMessage(error: unknown) {
  if (isAxiosError(error)) return error.response?.data?.errors?.join(', ') || error.response?.data?.error || error.message
  return 'Unable to save. Please try again.'
}
