import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Initiative } from '@/types'

export function useInitiatives() {
  return useQuery<Initiative[]>({
    queryKey: ['initiatives'],
    queryFn: () => api.get('/api/v1/initiatives').then((r) => r.data),
  })
}

export function useCreateInitiative() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string }) =>
      api.post('/api/v1/initiatives', { initiative: data }).then((r) => r.data as Initiative),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['initiatives'] })
      qc.invalidateQueries({ queryKey: ['milestones'] })
    },
  })
}

export function useUpdateInitiative() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Initiative> & { id: number }) =>
      api.patch(`/api/v1/initiatives/${id}`, { initiative: data }).then((r) => r.data as Initiative),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['initiatives'] })
      qc.invalidateQueries({ queryKey: ['milestones'] })
    },
  })
}

export function useDeleteInitiative() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/initiatives/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['initiatives'] })
      qc.invalidateQueries({ queryKey: ['epics'] })
    },
  })
}
