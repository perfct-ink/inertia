import { useState } from 'react'
import { Button, Input, Modal } from '@/components/ui'
import { ALL_FEATURES, type WorkspaceFeature } from '@/data/workspaceFeature'
import { FeatureChecklist } from './FeatureChecklist'

// Name a new Space and choose which optional sections it starts with.
export function NewWorkspaceDialog({ open, onSubmit, onClose }: { open: boolean; onSubmit: (input: { name: string; features: string[] }) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [features, setFeatures] = useState<WorkspaceFeature[]>(ALL_FEATURES)

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit({ name: trimmed, features })
    setName('')
    setFeatures(ALL_FEATURES)
  }

  return (
    <Modal open={open} title="New space" onClose={onClose}>
      <Input autoFocus aria-label="Space name" placeholder="e.g. Website relaunch" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />
      <FeatureChecklist value={features} onChange={setFeatures} />
      <div className="ui-modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!name.trim()} onClick={submit}>Create</Button>
      </div>
    </Modal>
  )
}
