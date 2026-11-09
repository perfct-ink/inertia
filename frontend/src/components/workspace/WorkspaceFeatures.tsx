import { useEffect, useState } from 'react'
import { Button, FormError, Modal } from '@/components/ui'
import { useUpdateWorkspaceFeatures } from '@/api/workspace'
import { canManageWorkspace } from '@/api/workspaces'
import { errorMessage } from '@/util/errorMessage'
import { enabledFeatures, featuresChanged, type WorkspaceFeature } from '@/data/workspaceFeature'
import type { WorkspaceSummary } from '@/types'
import { FeatureChecklist } from './FeatureChecklist'

// Space settings: which optional pages the Space shows. Admins and owners
// change it; everyone else sees the list read-only. Turning a page off hides it
// from the rail and quick add and deletes nothing.
export function WorkspaceFeatures({ workspace, open, onClose }: { workspace: WorkspaceSummary; open: boolean; onClose: () => void }) {
  const update = useUpdateWorkspaceFeatures()
  const saved = enabledFeatures(workspace)
  const [draft, setDraft] = useState<WorkspaceFeature[] | null>(null)
  const [error, setError] = useState('')
  const value = draft ?? saved
  const canManage = canManageWorkspace(workspace.role)

  // Each opening starts from what the Space has now.
  useEffect(() => { if (open) { setDraft(null); setError('') } }, [open])

  function save() {
    setError('')
    update.mutate(value, { onSuccess: onClose, onError: (e) => setError(errorMessage(e)) })
  }

  return (
    <Modal
      open={open}
      title={`Features in ${workspace.name}`}
      description={canManage
        ? "Turn off the pages this Space doesn't use. Tasks, files and projects are always on. Nothing is deleted; turn a page back on and it shows again."
        : 'The pages this Space uses. Only an admin or owner can change them.'}
      onClose={onClose}
    >
      <FeatureChecklist value={value} onChange={setDraft} disabled={!canManage} />
      <FormError message={error} />
      <div className="ui-modal-actions">
        <Button variant="secondary" onClick={onClose}>{canManage ? 'Cancel' : 'Close'}</Button>
        {canManage && (
          <Button variant="primary" disabled={!featuresChanged(saved, value) || update.isPending} onClick={save}>Save</Button>
        )}
      </div>
    </Modal>
  )
}
