import { useNavigate, type NavigateOptions, type To } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useWorkspaceStore } from '@/store/workspaces'
import { useTabsStore } from '@/store/tabs'
import { useProjectStore } from '@/store/projects'
import type { WorkspaceSummary } from '@/types'

// Makes a Space the active one and goes to `to` in it. Cached data and open
// tabs belong to the previous Space, so both are dropped, as is its open project.
export function useOpenInWorkspace() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  return (workspace: WorkspaceSummary, to: To, options?: NavigateOptions) => {
    // The personal workspace is the server default, so it is stored as "none".
    useWorkspaceStore.getState().setActive(workspace.personal ? null : workspace.id)
    useTabsStore.getState().reset()
    useProjectStore.getState().setActive(null)
    qc.clear()
    navigate(to, options)
  }
}

// Makes a Space the active one and returns to its home. Takes only the Space
// so it can be passed straight to a mutation's onSuccess.
export function useSwitchWorkspace() {
  const openIn = useOpenInWorkspace()
  return (workspace: WorkspaceSummary) => openIn(workspace, '/space')
}
