import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Idea } from '@/types'

export function useIdeas() {
  return useQuery<Idea[]>({
    queryKey: ['ideas'],
    queryFn: () => api.get('/api/v1/ideas').then((r) => r.data),
  })
}

export function useCreateIdea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; description?: string }) => api.post('/api/v1/ideas', { idea: data }).then((r) => r.data as Idea),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ideas'] }),
  })
}

export function useUpdateIdea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; status?: 'open' | 'declined'; title?: string; description?: string | null }) =>
      api.patch(`/api/v1/ideas/${id}`, { idea: data }).then((r) => r.data as Idea),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ideas'] }),
  })
}

export function useDeleteIdea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/ideas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ideas'] }),
  })
}

// Creates an epic or initiative from the idea; refreshes those lists too.
export function usePromoteIdea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, to }: { id: number; to: 'epic' | 'initiative' }) => api.post(`/api/v1/ideas/${id}/promote`, { to }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ideas'] })
      qc.invalidateQueries({ queryKey: ['epics'] })
      qc.invalidateQueries({ queryKey: ['initiatives'] })
    },
  })
}
