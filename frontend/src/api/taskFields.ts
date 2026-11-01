import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { TaskField, TaskFieldType } from '@/types'

// The custom fields of the current Space. Everyone in the Space can read them;
// adding, renaming and deleting are for Space admins and owners (the server
// answers 403 otherwise, and the error is shown by the API middleware).
export function useTaskFields() {
  return useQuery<TaskField[]>({
    queryKey: ['task_fields'],
    queryFn: () => api.get('/api/v1/task_fields').then((r) => r.data),
  })
}

export function useCreateTaskField() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; data_type: TaskFieldType }) =>
      api.post('/api/v1/task_fields', { task_field: data }).then((r) => r.data as TaskField),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task_fields'] }),
  })
}

export function useUpdateTaskField() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name: string }) =>
      api.patch(`/api/v1/task_fields/${id}`, { task_field: data }).then((r) => r.data as TaskField),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task_fields'] }),
  })
}

export function useDeleteTaskField() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/task_fields/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task_fields'] })
      // The server drops the field's values from every task.
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
