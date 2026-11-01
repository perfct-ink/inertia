import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { TaskStatusSetting } from '@/types'
import type { StatusOverride } from '@/data/task_status'

// Every setting in the Space (the Space default and each folder's own). Which
// ones apply to a board is worked out in data/task_status.ts.
export function useTaskStatusSettings() {
  return useQuery<TaskStatusSetting[]>({
    queryKey: ['task_status_settings'],
    queryFn: () => api.get('/api/v1/task_status_settings').then((r) => r.data),
  })
}

// Replaces one board's settings (folderId null is the Space default) with the
// statuses given; the response is the whole Space's list.
export function useSaveTaskStatusSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ folderId, statuses }: { folderId: number | null; statuses: StatusOverride[] }) =>
      api.put('/api/v1/task_status_settings', { folder_id: folderId, statuses }).then((r) => r.data as TaskStatusSetting[]),
    onSuccess: (settings) => qc.setQueryData(['task_status_settings'], settings),
  })
}

// Clears one board's settings so it follows the defaults again.
export function useResetTaskStatusSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (folderId: number | null) =>
      api.delete('/api/v1/task_status_settings', { params: folderId == null ? {} : { folder_id: folderId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task_status_settings'] }),
  })
}
