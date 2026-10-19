import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Sprint, PlanningStatus } from '@/types'

type SprintInput = {
  title: string
  goal: string | null
  start_date: string | null
  end_date: string | null
  status: PlanningStatus
  owner_id: number | null
}

// tasks_count/done_tasks_count change whenever a task does, so always
// refetch on visit — same reasoning as useMilestones.
export function useSprints() {
  return useQuery<Sprint[]>({
    queryKey: ['sprints'],
    queryFn: () => api.get('/api/v1/sprints').then((r) => r.data),
    staleTime: 0,
  })
}

export function useCreateSprint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Pick<SprintInput, 'title'> & Partial<SprintInput>) =>
      api.post('/api/v1/sprints', { sprint: data }).then((r) => r.data as Sprint),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sprints'] }),
  })
}

export function useUpdateSprint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<SprintInput> & { id: number }) =>
      api.patch(`/api/v1/sprints/${id}`, { sprint: data }).then((r) => r.data as Sprint),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sprints'] }),
  })
}

export function useDeleteSprint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/sprints/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sprints'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

// Starts a planned sprint (a missing start date becomes today).
export function useStartSprint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post(`/api/v1/sprints/${id}/start`).then((r) => r.data as Sprint),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sprints'] }),
  })
}

// Closes an active sprint; unfinished tasks move to `carryToSprintId` or lose their sprint.
export function useCloseSprint() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, carryToSprintId }: { id: number; carryToSprintId: number | null }) =>
      api.post(`/api/v1/sprints/${id}/close`, { carry_to_sprint_id: carryToSprintId }).then((r) => r.data as { sprint: Sprint; completed: number; carried_over: number }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sprints'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
