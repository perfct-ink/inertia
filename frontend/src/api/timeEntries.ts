import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface TimeEntry {
  id: number
  task_id: number
  user_id: number
  user_name: string
  started_at: string
  ended_at: string | null
  minutes: number
}

// The task list carries each task's logged total and the user's running
// timer, so every change refreshes it.
function useTimeEntryMutation<T>(request: (vars: T) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useStartTimer() {
  return useTimeEntryMutation((taskId: number) =>
    api.post(`/api/v1/tasks/${taskId}/time_entries`).then((r) => r.data as TimeEntry))
}

export function useStopTimer() {
  return useTimeEntryMutation((entryId: number) =>
    api.post(`/api/v1/time_entries/${entryId}/stop`).then((r) => r.data as TimeEntry))
}

export function useLogTime() {
  return useTimeEntryMutation(({ taskId, minutes }: { taskId: number; minutes: number }) =>
    api.post(`/api/v1/tasks/${taskId}/time_entries`, { time_entry: { minutes } }).then((r) => r.data as TimeEntry))
}
