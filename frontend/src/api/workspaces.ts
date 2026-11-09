import type { WorkspaceSummary } from '@/types'
import type { WorkspaceFeature } from '@/data/workspaceFeature'
import { ApiResource, useApiMutation, useResourceList } from './base'

// Role rules are plain data and live in data/workspace.ts.
export { WORKSPACE_ROLES, canManageWorkspace, canWriteWorkspace } from '@/data/workspace'

// What a new Space is made from: a name, and optionally the pages it starts with
// (every page when left out).
export interface NewWorkspace {
  name: string
  features?: WorkspaceFeature[]
}

export class WorkspaceApi extends ApiResource<WorkspaceSummary, NewWorkspace> {
  constructor() {
    super('/api/v1/workspaces', 'workspace', 'workspaces')
  }
}

export const workspaceApi = new WorkspaceApi()

// Every workspace the user belongs to.
export const useWorkspaces = () => useResourceList(workspaceApi)
// Takes a name, or a name with the pages the Space starts with.
export const useCreateWorkspace = () => useApiMutation((input: string | NewWorkspace) => workspaceApi.create(typeof input === 'string' ? { name: input } : input), ['workspaces'])
export const useDeleteWorkspace = () => useApiMutation((id: number) => workspaceApi.destroy(id), ['workspaces'])
