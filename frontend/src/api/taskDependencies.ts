import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { DependencyKind, TaskDependency } from '@/types'

export function useTaskDependencies() {
  return useQuery<TaskDependency[]>({
    queryKey: ['task_dependencies'],
    queryFn: () => api.get('/api/v1/task_dependencies').then((r) => r.data),
  })
}

export function useCreateTaskDependency() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { predecessor_id: number; successor_id: number; kind: DependencyKind }) =>
      api.post('/api/v1/task_dependencies', { task_dependency: data }).then((r) => r.data as TaskDependency),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task_dependencies'] }),
  })
}

export function useDeleteTaskDependency() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/task_dependencies/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task_dependencies'] }),
  })
}
