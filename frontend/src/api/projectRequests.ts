import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ProjectRequestInput } from '@/data/projectRequest'
import type { ProjectRequest } from '@/types'

export function useProjectRequests() {
  return useQuery<ProjectRequest[]>({
    queryKey: ['project-requests'],
    queryFn: () => api.get('/api/v1/project_requests').then((r) => r.data),
  })
}

export function useCreateProjectRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ProjectRequestInput) =>
      api.post('/api/v1/project_requests', { project_request: data }).then((r) => r.data as ProjectRequest),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-requests'] }),
  })
}

export function useUpdateProjectRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: ProjectRequestInput & { id: number }) =>
      api.patch(`/api/v1/project_requests/${id}`, { project_request: data }).then((r) => r.data as ProjectRequest),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-requests'] }),
  })
}

export function useDeleteProjectRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/project_requests/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-requests'] }),
  })
}

export type ProjectRequestDecision = 'approve' | 'decline' | 'reopen'

// Approving creates the project folder, so the sidebar tree and the Projects
// page (both read the workspace) are refreshed along with the requests.
export function useDecideProjectRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, decision, decision_note }: { id: number; decision: ProjectRequestDecision; decision_note?: string }) =>
      api.post(`/api/v1/project_requests/${id}/${decision}`, { decision_note }).then((r) => r.data as ProjectRequest),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-requests'] })
      qc.invalidateQueries({ queryKey: ['workspace'] })
    },
  })
}
