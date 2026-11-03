import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

export interface RoadmapShare { id: number; token: string }

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
