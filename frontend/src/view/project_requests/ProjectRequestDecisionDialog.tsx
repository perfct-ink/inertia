import { useEffect, useState, type FormEvent } from 'react'
import { Button, Modal, Textarea } from '@/components/ui'
import type { ProjectRequestDecision } from '@/api/projectRequests'
import type { ProjectRequest } from '@/types'

// Reopening a declined request needs no dialog.
export type Decision = Exclude<ProjectRequestDecision, 'reopen'>

type Props = {
  request: ProjectRequest | null
  decision: Decision | null
  busy: boolean
  onSubmit: (note: string) => void
  onClose: () => void
}

// Approve or decline a pending request. Approving may carry a note;
// declining needs a reason the requester can read.
export default function ProjectRequestDecisionDialog({ request, decision, busy, onSubmit, onClose }: Props) {
  const open = request != null && decision != null
  const approving = decision === 'approve'
  const [note, setNote] = useState('')
  useEffect(() => { if (open) setNote('') }, [open])

  const title = approving ? 'Approve project' : 'Decline project'
  const description = request
    ? approving
      ? `Approving "${request.name}" creates it as a project in this Space.`
      : `Tell ${request.requested_by_name ?? 'the requester'} why "${request.name}" is declined.`
    : undefined
  const canSubmit = approving || note.trim().length > 0

  function submit(event: FormEvent) {
    event.preventDefault()
    if (canSubmit) onSubmit(note.trim())
  }

  return (
    <Modal open={open} title={title} description={description} onClose={onClose}>
      <form onSubmit={submit} className="ui-modal-form">
        <Textarea
          autoFocus
          rows={3}
          aria-label={approving ? 'Note (optional)' : 'Reason'}
          aria-required={!approving}
          placeholder={approving ? 'Note for the requester (optional)' : 'Reason for declining'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="ui-modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!canSubmit || busy}>{approving ? 'Approve' : 'Decline'}</Button>
        </div>
      </form>
    </Modal>
  )
}
