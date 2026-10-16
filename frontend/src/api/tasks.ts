import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Task } from '@/types'

export interface TaskFilters {
  q?: string
  status?: string
  folder_id?: number
  document_id?: number
  epic_id?: number
  sprint_id?: number
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery<Task[]>({
    queryKey: ['tasks', filters],
    queryFn: () => api.get('/api/v1/tasks', { params: filters }).then((r) => r.data),
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { title: string; status?: Task['status']; startDate?: string; dueDate?: string; documentId?: number; folder_id?: number; epicId?: number; sprintId?: number; parentId?: number }) => {
      const { documentId, startDate, dueDate, epicId, sprintId, parentId, ...rest } = data
      const url = documentId ? `/api/v1/documents/${documentId}/tasks` : '/api/v1/tasks'
      return api.post(url, { task: { ...rest, start_date: startDate, due_date: dueDate, epic_id: epicId, sprint_id: sprintId, parent_id: parentId } }).then((r) => r.data as Task)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Task> & { id: number }) =>
      api.patch(`/api/v1/tasks/${id}`, { task: data }).then((r) => r.data as Task),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
