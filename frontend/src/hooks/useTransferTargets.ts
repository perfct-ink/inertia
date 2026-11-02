import { useWorkspace } from '@/api/workspace'
import { useWorkspaces } from '@/api/workspaces'
import { canWriteWorkspace, transferTargets } from '@/data/workspace'

// The other Spaces the user can move or copy things into from the active one.
// Empty when there are none, and when the user can only read the active Space
// (taking things out of it needs the same role as editing it).
export function useTransferTargets() {
  const { data: current } = useWorkspace()
  const { data: spaces, isLoading } = useWorkspaces()
  const targets = current && canWriteWorkspace(current.role) ? transferTargets(spaces ?? [], current.id) : []
  return { targets, isLoading: isLoading || !current }
}
