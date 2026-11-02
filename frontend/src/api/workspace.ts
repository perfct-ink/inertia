import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useWorkspaceStore } from '@/store/workspaces'
import type { Workspace } from '@/types'

// The singleton resource at /api/v1/workspace: the active workspace
// (X-Workspace-Id) with its folders and documents. The workspaces the user
// belongs to are in workspaces.ts.
export class ActiveWorkspaceApi {
  readonly path = '/api/v1/workspace'
  readonly queryKey = 'workspace'

  // If the stored workspace is gone or the user lost access (404), fall back
  // to their personal workspace.
  find() {
    return api.get<Workspace>(this.path, { silent: true }).then((r) => r.data).catch((error) => {
      const { activeWorkspaceId, setActive } = useWorkspaceStore.getState()
      if (error.response?.status !== 404 || !activeWorkspaceId) throw error
      setActive(null)
      return api.get<Workspace>(this.path).then((r) => r.data)
    })
  }
}

export const activeWorkspaceApi = new ActiveWorkspaceApi()

export function useWorkspace() {
  return useQuery<Workspace>({
    queryKey: [activeWorkspaceApi.queryKey],
    queryFn: () => activeWorkspaceApi.find(),
  })
}
