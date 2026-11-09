import { useEffect, useState, type FormEvent } from 'react'
import { Button, Input, Modal } from '@/components/ui'
import { ALL_WORKSPACE_FEATURES, type WorkspaceFeature } from '@/data/workspaceFeature'
import type { NewWorkspace } from '@/api/workspaces'
import { FeatureChecklist } from './FeatureChecklist'

// Name a new Space and choose which optional pages it starts with (all on).
// The creator becomes its owner, so can change the choice later from the Space
// switcher's Features.
export function NewWorkspaceDialog({ open, onSubmit, onClose }: { open: boolean; onSubmit: (input: NewWorkspace) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [features, setFeatures] = useState<WorkspaceFeature[]>(ALL_WORKSPACE_FEATURES)

  useEffect(() => { if (open) { setName(''); setFeatures(ALL_WORKSPACE_FEATURES) } }, [open])

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit({ name: trimmed, features })
    onClose()
  }

  return (
    <Modal open={open} title="New Space" onClose={onClose}>
      <form onSubmit={submit} className="ui-modal-form">
        <Input autoFocus aria-label="Space name" placeholder="e.g. Website relaunch" value={name} onChange={(e) => setName(e.target.value)} />
        <FeatureChecklist value={features} onChange={setFeatures} />
        <div className="ui-modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!name.trim()}>Create</Button>
        </div>
      </form>
    </Modal>
  )
}
