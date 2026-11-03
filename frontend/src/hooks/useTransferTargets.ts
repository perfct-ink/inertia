import { useWorkspace } from '@/api/workspace'
import { useWorkspaces } from '@/api/workspaces'
import { canTransfer, transferDestinations } from '@/data/transfer'

// The other Spaces the user can move or copy things into from the active one
// (see transferDestinations), and whether there are any: every entry point
// hides its action when `canTransfer` is false.
export function useTransferTargets() {
  const { data: current } = useWorkspace()
  const { data: spaces, isLoading } = useWorkspaces()
  const targets = transferDestinations(current, spaces ?? [])
  return { targets, canTransfer: canTransfer(targets), isLoading: isLoading || !current }
}
