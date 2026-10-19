import { useState } from 'react'
import { Button, Modal } from '@/components/ui'
import { canManageWorkspace, useUpdateWorkspaceFeatures } from '@/api/workspaces'
import { ALL_FEATURES, type WorkspaceFeature } from '@/data/workspaceFeature'
import type { WorkspaceSummary } from '@/types'
import { FeatureChecklist } from './FeatureChecklist'

// Space settings: which optional sections the Space shows. Owners and admins
// can change it; everyone else sees the list read-only.
export function WorkspaceFeatures({ workspace, open, onClose }: { workspace: WorkspaceSummary; open: boolean; onClose: () => void }) {
  const update = useUpdateWorkspaceFeatures()
  const saved = (workspace.features ?? ALL_FEATURES) as WorkspaceFeature[]
  const [draft, setDraft] = useState<WorkspaceFeature[] | null>(null)
  const value = draft ?? saved
  const canManage = canManageWorkspace(workspace.role)

  function close() { setDraft(null); onClose() }

  return (
    <Modal open={open} title={`${workspace.name} features`} description="Turn off what this Space doesn't use. Nothing is deleted; turning a feature back on shows it again." onClose={close}>
      <FeatureChecklist value={value} onChange={setDraft} disabled={!canManage} />
      <div className="ui-modal-actions">
        <Button variant="secondary" onClick={close}>Cancel</Button>
        {canManage && (
          <Button variant="primary" disabled={draft === null || update.isPending} onClick={() => update.mutate(value, { onSuccess: close })}>Save</Button>
        )}
      </div>
    </Modal>
  )
}
