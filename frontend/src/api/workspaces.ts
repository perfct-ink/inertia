import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { WorkspaceSummary, WorkspaceMember, WorkspaceRole } from '@/types'

// Order matters: a role can do everything the roles before it can.
export const WORKSPACE_ROLES: WorkspaceRole[] = ['viewer', 'member', 'admin', 'owner']

export const canManageWorkspace = (role: WorkspaceRole | null | undefined) => role === 'admin' || role === 'owner'
export const canWriteWorkspace = (role: WorkspaceRole | null | undefined) => !!role && role !== 'viewer'

// Every workspace the user belongs to.
export function useWorkspaces() {
  return useQuery<WorkspaceSummary[]>({
    queryKey: ['workspaces'],
    queryFn: () => api.get('/api/v1/workspaces').then((r) => r.data),
  })
}

export function useCreateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    // A name alone, or a name with the features the Space should start with.
    mutationFn: (input: string | { name: string; features?: string[] }) => {
      const workspace = typeof input === 'string' ? { name: input } : input
      return api.post('/api/v1/workspaces', { workspace }).then((r) => r.data as WorkspaceSummary)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  })
}

// Owners and admins choose which optional sections the active Space shows.
export function useUpdateWorkspaceFeatures() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (features: string[]) => api.patch('/api/v1/workspace', { workspace: { features } }).then((r) => r.data as WorkspaceSummary),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace'] })
      qc.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useDeleteWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/workspaces/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  })
}

export function useWorkspaceMembers(workspaceId: number) {
  return useQuery<WorkspaceMember[]>({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => api.get(`/api/v1/workspaces/${workspaceId}/members`).then((r) => r.data),
    enabled: !!workspaceId,
  })
}

function useMemberMutation<T>(workspaceId: number, request: (vars: T) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-members', workspaceId] }),
  })
}

export function useAddMember(workspaceId: number) {
  return useMemberMutation(workspaceId, ({ email, role }: { email: string; role: WorkspaceRole }) =>
    api.post(`/api/v1/workspaces/${workspaceId}/members`, { email, role }))
}

export function useUpdateMemberRole(workspaceId: number) {
  return useMemberMutation(workspaceId, ({ id, role }: { id: number; role: WorkspaceRole }) =>
    api.patch(`/api/v1/workspaces/${workspaceId}/members/${id}`, { role }))
}

export function useRemoveMember(workspaceId: number) {
  return useMemberMutation(workspaceId, (id: number) =>
    api.delete(`/api/v1/workspaces/${workspaceId}/members/${id}`))
}
