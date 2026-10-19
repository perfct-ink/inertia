import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Epic, Initiative, Milestone } from '@/types'

export interface RoadmapShare { id: number; token: string }

// What the public link returns: a trimmed roadmap (no owners or descriptions).
export interface SharedRoadmap {
  name: string
  milestones: Milestone[]
  initiatives: Initiative[]
  epics: Epic[]
}

export function useRoadmapShare() {
  return useQuery<RoadmapShare | null>({
    queryKey: ['roadmap_share'],
    queryFn: () => api.get('/api/v1/roadmap_share').then((r) => r.data),
  })
}

export function useCreateRoadmapShare() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/api/v1/roadmap_share').then((r) => r.data as RoadmapShare),
    onSuccess: (share) => qc.setQueryData(['roadmap_share'], share),
  })
}

export function useDeleteRoadmapShare() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.delete('/api/v1/roadmap_share'),
    onSuccess: () => qc.setQueryData(['roadmap_share'], null),
  })
}

export function useSharedRoadmap(token: string) {
  return useQuery<SharedRoadmap>({
    queryKey: ['shared_roadmap', token],
    queryFn: () => api.get(`/api/v1/shared/${token}`).then((r) => r.data.resource.roadmap),
    retry: false,
  })
}
