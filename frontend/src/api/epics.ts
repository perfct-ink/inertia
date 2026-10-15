import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Epic } from '@/types'

export function useEpics() {
  return useQuery<Epic[]>({
    queryKey: ['epics'],
    queryFn: () => api.get('/api/v1/epics').then((r) => r.data),
  })
}

export function useCreateEpic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string }) =>
      api.post('/api/v1/epics', { epic: data }).then((r) => r.data as Epic),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epics'] })
      qc.invalidateQueries({ queryKey: ['milestones'] })
    },
  })
}

export function useUpdateEpic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Epic> & { id: number }) =>
      api.patch(`/api/v1/epics/${id}`, { epic: data }).then((r) => r.data as Epic),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epics'] })
      qc.invalidateQueries({ queryKey: ['milestones'] })
    },
  })
}

export function useDeleteEpic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/epics/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epics'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
