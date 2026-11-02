import type { WorkspaceRole, WorkspaceSummary } from '@/types'
import { ApiResource, useApiMutation, useResourceList } from './base'

// Role rules are plain data and live in data/workspace.ts.
export { WORKSPACE_ROLES, canManageWorkspace, canWriteWorkspace } from '@/data/workspace'

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
