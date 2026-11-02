import type { WorkspaceRole, WorkspaceSummary } from '@/types'
import { ApiResource, useApiMutation, useResourceList } from './base'

// Order matters: a role can do everything the roles before it can.
export const WORKSPACE_ROLES: WorkspaceRole[] = ['viewer', 'member', 'admin', 'owner']

export const canManageWorkspace = (role: WorkspaceRole | null | undefined) => role === 'admin' || role === 'owner'
export const canWriteWorkspace = (role: WorkspaceRole | null | undefined) => !!role && role !== 'viewer'

export class WorkspaceApi extends ApiResource<WorkspaceSummary, { name: string }> {
  constructor() {
    super('/api/v1/workspaces', 'workspace', 'workspaces')
  }
}

export const workspaceApi = new WorkspaceApi()

// Every workspace the user belongs to.
export const useWorkspaces = () => useResourceList(workspaceApi)
export const useCreateWorkspace = () => useApiMutation((name: string) => workspaceApi.create({ name }), ['workspaces'])
export const useDeleteWorkspace = () => useApiMutation((id: number) => workspaceApi.destroy(id), ['workspaces'])
