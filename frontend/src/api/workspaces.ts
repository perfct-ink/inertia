import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { WorkspaceSummary, WorkspaceMember, WorkspaceRole, WorkspaceInvitation } from '@/types'

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
    mutationFn: (name: string) => api.post('/api/v1/workspaces', { workspace: { name } }).then((r) => r.data as WorkspaceSummary),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
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

// Pending invitations for people without an account; only admins and owners may list them.
export function useWorkspaceInvitations(workspaceId: number, enabled: boolean) {
  return useQuery<WorkspaceInvitation[]>({
    queryKey: ['workspace-invitations', workspaceId],
    queryFn: () => api.get(`/api/v1/workspaces/${workspaceId}/invitations`).then((r) => r.data),
    enabled: enabled && !!workspaceId,
  })
}

function useInvitationMutation<T>(workspaceId: number, request: (vars: T) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace-invitations', workspaceId] }),
  })
}

export function useCreateInvitation(workspaceId: number) {
  return useInvitationMutation(workspaceId, ({ email, role }: { email: string; role: WorkspaceRole }) =>
    api.post(`/api/v1/workspaces/${workspaceId}/invitations`, { email, role }).then((r) => r.data as WorkspaceInvitation))
}

export function useRevokeInvitation(workspaceId: number) {
  return useInvitationMutation(workspaceId, (id: number) =>
    api.delete(`/api/v1/workspaces/${workspaceId}/invitations/${id}`))
}

// Joins the signed-in user to the Space the invite link is for.
export function useAcceptInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (token: string) =>
      api.post(`/api/v1/invitations/${encodeURIComponent(token)}/accept`, undefined, { silent: true }).then((r) => r.data as WorkspaceSummary),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  })
}
