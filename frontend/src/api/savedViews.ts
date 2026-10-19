import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { SavedView } from '@/types'

export function useSavedViews(page: string) {
  return useQuery<SavedView[]>({
    queryKey: ['saved_views', page],
    queryFn: () => api.get('/api/v1/saved_views', { params: { page } }).then((r) => r.data),
  })
}

export function useCreateSavedView(page: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; shared: boolean; config: Record<string, unknown> }) =>
      api.post('/api/v1/saved_views', { saved_view: { page, ...data } }).then((r) => r.data as SavedView),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved_views', page] }),
  })
}

export function useDeleteSavedView(page: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/saved_views/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved_views', page] }),
  })
}
