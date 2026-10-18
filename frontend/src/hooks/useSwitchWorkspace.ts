import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useWorkspaceStore } from '@/store/workspaces'
import { useTabsStore } from '@/store/tabs'
import type { WorkspaceSummary } from '@/types'

// Makes a Space the active one and returns to its home. Cached data and open
// tabs belong to the previous Space, so both are dropped.
export function useSwitchWorkspace() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  return (workspace: WorkspaceSummary) => {
    // The personal workspace is the server default, so it is stored as "none".
    useWorkspaceStore.getState().setActive(workspace.personal ? null : workspace.id)
    useTabsStore.getState().reset()
    qc.clear()
    navigate('/space')
  }
}
