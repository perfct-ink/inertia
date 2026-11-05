import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { WorkspaceInvitation, WorkspaceRole, WorkspaceSummary } from '@/types'
import { ApiResource, useApiMutation } from './base'

// Pending invitations to one Space, for people who may not have an account
// yet. The API sends the fields as the body itself.
export class WorkspaceInvitationApi extends ApiResource<WorkspaceInvitation, { email: string; role: WorkspaceRole }> {
  constructor(workspaceId: number) {
    super(`/api/v1/workspaces/${workspaceId}/invitations`, null, 'workspace-invitations')
  }

  // Joins the signed-in user to the Space the invite link is for.
  static accept(token: string) {
    return api.post<WorkspaceSummary>(`/api/v1/invitations/${encodeURIComponent(token)}/accept`, undefined, { silent: true }).then((r) => r.data)
  }
}

export function useWorkspaceInvitations(workspaceId: number, enabled: boolean) {
  return useQuery<WorkspaceInvitation[]>({
    queryKey: ['workspace-invitations', workspaceId],
    queryFn: () => new WorkspaceInvitationApi(workspaceId).list(),
    enabled: enabled && !!workspaceId,
  })
}

export const useCreateInvitation = (workspaceId: number) =>
  useApiMutation((data: { email: string; role: WorkspaceRole }) => new WorkspaceInvitationApi(workspaceId).create(data), [['workspace-invitations', workspaceId]])
export const useRevokeInvitation = (workspaceId: number) =>
  useApiMutation((id: number) => new WorkspaceInvitationApi(workspaceId).destroy(id), [['workspace-invitations', workspaceId]])
export const useAcceptInvitation = () => useApiMutation((token: string) => WorkspaceInvitationApi.accept(token), ['workspaces'])
