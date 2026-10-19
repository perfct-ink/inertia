import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Release, Task } from '@/types'

export function useReleases() {
  return useQuery<Release[]>({
    queryKey: ['releases'],
    queryFn: () => api.get('/api/v1/releases').then((r) => r.data),
  })
}

type ReleaseInput = Partial<Pick<Release, 'title' | 'kind' | 'release_date'>>

function useReleaseMutation<T>(request: (vars: T) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['releases'] })
      qc.invalidateQueries({ queryKey: ['release_tasks'] })
    },
  })
}

export const useCreateRelease = () => useReleaseMutation((data: ReleaseInput & { title: string }) => api.post('/api/v1/releases', { release: data }))
export const useUpdateRelease = () => useReleaseMutation(({ id, ...data }: ReleaseInput & { id: number }) => api.patch(`/api/v1/releases/${id}`, { release: data }))
export const useDeleteRelease = () => useReleaseMutation((id: number) => api.delete(`/api/v1/releases/${id}`))
export const useAddReleaseDocument = () => useReleaseMutation(({ id, documentId }: { id: number; documentId: number }) => api.post(`/api/v1/releases/${id}/documents`, { document_id: documentId }))
export const useRemoveReleaseDocument = () => useReleaseMutation(({ id, documentId }: { id: number; documentId: number }) => api.delete(`/api/v1/releases/${id}/documents/${documentId}`))

// Every task in the release's documents.
export function useReleaseTasks(id: number, enabled: boolean) {
  return useQuery<Task[]>({
    queryKey: ['release_tasks', id],
    queryFn: () => api.get(`/api/v1/releases/${id}/tasks`).then((r) => r.data),
    enabled,
  })
}

// Creates the standard checklist for the release's kind, due dates counted back from its date.
export function usePlanRelease() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.post(`/api/v1/releases/${id}/plan`).then((r) => r.data as { created: number; release: Release }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['releases'] })
      qc.invalidateQueries({ queryKey: ['release_tasks'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}
