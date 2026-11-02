import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ResourceAllocation } from '@/types'

type AllocationInput = {
  user_id: number
  folder_id: number
  hours_per_week: number
  start_date: string | null
  end_date: string | null
}

// Who is planned onto which project, for the active Space.
export function useResourceAllocations() {
  return useQuery<ResourceAllocation[]>({
    queryKey: ['resource-allocations'],
    queryFn: () => api.get('/api/v1/resource_allocations').then((r) => r.data),
  })
}

export function useCreateResourceAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Pick<AllocationInput, 'user_id' | 'folder_id' | 'hours_per_week'> & Partial<AllocationInput>) =>
      api.post('/api/v1/resource_allocations', { resource_allocation: data }).then((r) => r.data as ResourceAllocation),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resource-allocations'] }),
  })
}

export function useUpdateResourceAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<AllocationInput> & { id: number }) =>
      api.patch(`/api/v1/resource_allocations/${id}`, { resource_allocation: data }).then((r) => r.data as ResourceAllocation),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resource-allocations'] }),
  })
}

export function useDeleteResourceAllocation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/resource_allocations/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resource-allocations'] }),
  })
}
