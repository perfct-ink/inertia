import { useQuery } from '@tanstack/react-query'
import type { WorkspaceMember, WorkspaceRole } from '@/types'
import { ApiResource, useApiMutation } from './base'

// The members of one workspace; the API sends the fields as the body itself.
export class WorkspaceMemberApi extends ApiResource<WorkspaceMember, { email: string; role: WorkspaceRole }, { role?: WorkspaceRole; weekly_capacity_hours?: number }> {
  constructor(workspaceId: number) {
    super(`/api/v1/workspaces/${workspaceId}/members`, null, 'workspace-members')
  }
}

export function useWorkspaceMembers(workspaceId: number) {
  return useQuery<WorkspaceMember[]>({
    queryKey: ['workspace-members', workspaceId],
    queryFn: () => new WorkspaceMemberApi(workspaceId).list(),
    enabled: !!workspaceId,
  })
}

export const useAddMember = (workspaceId: number) =>
  useApiMutation((data: { email: string; role: WorkspaceRole }) => new WorkspaceMemberApi(workspaceId).create(data), [['workspace-members', workspaceId]])
export const useUpdateMemberRole = (workspaceId: number) =>
  useApiMutation(({ id, role }: { id: number; role: WorkspaceRole }) => new WorkspaceMemberApi(workspaceId).update(id, { role }), [['workspace-members', workspaceId]])
export const useUpdateMemberCapacity = (workspaceId: number) =>
  useApiMutation(({ id, hours }: { id: number; hours: number }) => new WorkspaceMemberApi(workspaceId).update(id, { weekly_capacity_hours: hours }), [['workspace-members', workspaceId]])
// Someone who leaves loses their project allocations.
export const useRemoveMember = (workspaceId: number) =>
  useApiMutation((id: number) => new WorkspaceMemberApi(workspaceId).destroy(id), [['workspace-members', workspaceId], 'resource-allocations'])
