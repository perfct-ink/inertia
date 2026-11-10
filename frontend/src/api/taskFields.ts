import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { withFieldValues } from '@/data/taskField'
import type { Task, TaskField, TaskFieldType, TaskFieldValue, TaskFieldValues } from '@/types'

// Failed calls show an error notice through the shared api client.

export function useTaskFields() {
  return useQuery<TaskField[]>({
    queryKey: ['task_fields'],
    queryFn: () => api.get('/api/v1/task_fields').then((r) => r.data),
  })
}

export function useCreateTaskField() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; field_type: TaskFieldType; options: string[]; display_format?: string | null; formula?: string | null }) =>
      api.post('/api/v1/task_fields', { task_field: data }).then((r) => r.data as TaskField),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task_fields'] }),
  })
}

export function useUpdateTaskField() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; name?: string; options?: string[]; display_format?: string | null; formula?: string | null }) =>
      api.patch(`/api/v1/task_fields/${id}`, { task_field: data }).then((r) => r.data as TaskField),
    // Changing a dropdown's choices can clear task values that used a removed one.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task_fields'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteTaskField() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/task_fields/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task_fields'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// The write endpoints answer with the task's full set of values; put them in
// every cached task list so the row updates without a refetch.
function useCacheFieldValues() {
  const qc = useQueryClient()
  return (data: { id: number; field_values: TaskFieldValues }) =>
    qc.setQueriesData<Task[]>({ queryKey: ['tasks'] }, (tasks) => tasks && withFieldValues(tasks, data.id, data.field_values))
}

// Sets one value; an empty one (null, [], false) clears it.
export function useSetTaskFieldValue() {
  const cache = useCacheFieldValues()
  return useMutation({
    mutationFn: ({ taskId, fieldId, value }: { taskId: number; fieldId: number; value: TaskFieldValue | null }) =>
      api.put(`/api/v1/tasks/${taskId}/field_values/${fieldId}`, { value }).then((r) => r.data as { id: number; field_values: TaskFieldValues }),
    onSuccess: cache,
  })
}

// Casts or takes back the signed-in user's own vote.
export function useVoteTaskField() {
  const cache = useCacheFieldValues()
  return useMutation({
    mutationFn: ({ taskId, fieldId, voted }: { taskId: number; fieldId: number; voted: boolean }) =>
      api.put(`/api/v1/tasks/${taskId}/field_values/${fieldId}/vote`, { voted }).then((r) => r.data as { id: number; field_values: TaskFieldValues }),
    onSuccess: cache,
  })
}
