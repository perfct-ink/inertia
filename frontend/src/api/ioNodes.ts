import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { IoNode } from '@/types'

export function useIoNodes() {
  return useQuery<IoNode[]>({
    queryKey: ['io_nodes'],
    queryFn: () => api.get('/api/v1/io_nodes').then((r) => r.data),
    // Linked objectives and initiatives move with their tasks.
    staleTime: 0,
  })
}

// Every write returns the whole map (progress depends on the tree), so the
// cache is replaced rather than refetched.
function useIoMutation<T>(request: (vars: T) => Promise<{ data: IoNode[] }>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: (response) => qc.setQueryData(['io_nodes'], response.data),
  })
}

export const useCreateIoNode = () => useIoMutation((data: { title: string; parent_id?: number }) => api.post('/api/v1/io_nodes', { io_node: data }))
export const useUpdateIoNode = () => useIoMutation(({ id, ...data }: { id: number; title?: string; description?: string | null; objective_id?: number | null; initiative_id?: number | null }) =>
  api.patch(`/api/v1/io_nodes/${id}`, { io_node: data }))
export const useDeleteIoNode = () => useIoMutation((id: number) => api.delete(`/api/v1/io_nodes/${id}`))
