import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Baseline } from '@/types'

export function useBaselines(folderId: number) {
  return useQuery<Baseline[]>({
    queryKey: ['baselines', folderId],
    queryFn: () => api.get(`/api/v1/folders/${folderId}/baselines`).then((r) => r.data),
  })
}

export function useCreateBaseline(folderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      api.post(`/api/v1/folders/${folderId}/baselines`, { baseline: { name } }).then((r) => r.data as Baseline),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['baselines', folderId] }),
  })
}

export function useDeleteBaseline(folderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/baselines/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['baselines', folderId] }),
  })
}
