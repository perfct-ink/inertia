import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { WorkspaceEvent } from '@/types'

export function useEvents() {
  return useQuery<WorkspaceEvent[]>({
    queryKey: ['events'],
    queryFn: () => api.get('/api/v1/events').then((r) => r.data),
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; date: string; event_type: 'deadline' | 'milestone'; description?: string; start_time?: string; end_time?: string; document_id?: number; folder_id?: number }) =>
      api.post('/api/v1/events', { event: data }).then((r) => r.data as WorkspaceEvent),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<WorkspaceEvent> & { id: number }) =>
      api.patch(`/api/v1/events/${id}`, { event: data }).then((r) => r.data as WorkspaceEvent),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useAddTaskToEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, taskId }: { eventId: number; taskId: number }) =>
      api.post(`/api/v1/events/${eventId}/event_tasks`, { task_id: taskId }).then((r) => r.data as WorkspaceEvent),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}

export function useRemoveTaskFromEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, taskId }: { eventId: number; taskId: number }) =>
      api.delete(`/api/v1/events/${eventId}/event_tasks/${taskId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['events'] }),
  })
}
