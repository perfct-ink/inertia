import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { KeyResult, KeyResultCheckIn, Objective, PlanningStatus } from '@/types'

// Linked key results move with task progress, so always refetch on visit.
export function useObjectives() {
  return useQuery<Objective[]>({
    queryKey: ['objectives'],
    queryFn: () => api.get('/api/v1/objectives').then((r) => r.data),
    staleTime: 0,
  })
}

type ObjectiveInput = {
  title: string
  description: string | null
  status: PlanningStatus
  start_date: string | null
  target_date: string | null
}

export function useCreateObjective() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Pick<ObjectiveInput, 'title'> & Partial<ObjectiveInput>) =>
      api.post('/api/v1/objectives', { objective: data }).then((r) => r.data as Objective),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['objectives'] }),
  })
}

export function useUpdateObjective() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<ObjectiveInput> & { id: number }) =>
      api.patch(`/api/v1/objectives/${id}`, { objective: data }).then((r) => r.data as Objective),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['objectives'] }),
  })
}

export function useDeleteObjective() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/objectives/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['objectives'] }),
  })
}

type KeyResultInput = Pick<KeyResult, 'title'> & Partial<Pick<KeyResult, 'initiative_id' | 'start_value' | 'target_value' | 'current_value' | 'unit'>>

export function useCreateKeyResult() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: KeyResultInput & { objective_id: number }) =>
      api.post('/api/v1/key_results', { key_result: data }).then((r) => r.data as KeyResult),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['objectives'] }),
  })
}

export function useUpdateKeyResult() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<KeyResultInput> & { id: number }) =>
      api.patch(`/api/v1/key_results/${id}`, { key_result: data }).then((r) => r.data as KeyResult),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['objectives'] })
      qc.invalidateQueries({ queryKey: ['key_result_check_ins', id] })
    },
  })
}

export function useDeleteKeyResult() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/key_results/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['objectives'] }),
  })
}

export function useKeyResultCheckIns(keyResultId: number, enabled: boolean) {
  return useQuery<KeyResultCheckIn[]>({
    queryKey: ['key_result_check_ins', keyResultId],
    queryFn: () => api.get(`/api/v1/key_results/${keyResultId}/check_ins`).then((r) => r.data),
    enabled,
  })
}

export function useCreateCheckIn(keyResultId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { value: number; note?: string }) =>
      api.post(`/api/v1/key_results/${keyResultId}/check_ins`, { check_in: data }).then((r) => r.data as KeyResultCheckIn),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['objectives'] })
      qc.invalidateQueries({ queryKey: ['key_result_check_ins', keyResultId] })
    },
  })
}
