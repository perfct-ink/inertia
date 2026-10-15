import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Milestone, PlanningStatus } from '@/types'

// Rollups change whenever tasks, epics or initiatives do, so always refetch on visit.
export function useMilestones() {
  return useQuery<Milestone[]>({
    queryKey: ['milestones'],
    queryFn: () => api.get('/api/v1/milestones').then((r) => r.data),
    staleTime: 0,
  })
}

type MilestoneInput = { title: string; description: string | null; target_date: string | null; status: PlanningStatus }

export function useCreateMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Pick<MilestoneInput, 'title'> & Partial<MilestoneInput>) =>
      api.post('/api/v1/milestones', { milestone: data }).then((r) => r.data as Milestone),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['milestones'] }),
  })
}

export function useUpdateMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<MilestoneInput> & { id: number }) =>
      api.patch(`/api/v1/milestones/${id}`, { milestone: data }).then((r) => r.data as Milestone),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['milestones'] }),
  })
}

export function useDeleteMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/milestones/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milestones'] })
      qc.invalidateQueries({ queryKey: ['epics'] })
      qc.invalidateQueries({ queryKey: ['initiatives'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
