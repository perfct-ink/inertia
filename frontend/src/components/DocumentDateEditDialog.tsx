import { useEffect, useState, type FormEvent } from 'react'
import { Button, DatePicker, Input, Modal } from '@/components/ui'
import type { DocumentDate } from '@/types'

// Changes a calendar entry made from a date chip: its day and its label, or
// deletes it. The day is the same record the chip in the document shows, so the
// chip changes too. The screen saves; a failed save shows the usual error notice
// and leaves the dialog open.
export default function DocumentDateEditDialog({ entry, pending, onSave, onDelete, onClose }: {
  entry: DocumentDate | null
  pending: boolean
  onSave: (values: { date: string; label: string }) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [date, setDate] = useState(entry?.date ?? '')
  const [label, setLabel] = useState(entry?.label ?? '')

  useEffect(() => {
    setDate(entry?.date ?? '')
    setLabel(entry?.label ?? '')
  }, [entry])

  const ready = !!date && !pending

  function submit(e: FormEvent) {
    e.preventDefault()
    if (ready) onSave({ date, label: label.trim() })
  }

  return (
    <Modal
      open={entry !== null}
      title="Edit date"
      description={entry?.document_id ? `Made in “${entry.document_title ?? 'a document'}”. The chip there changes too.` : 'Not linked to a document any more.'}
      onClose={onClose}
    >
      <form onSubmit={submit} className="ui-modal-form">
        <DatePicker aria-label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input aria-label="Label" placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
        <div className="ui-modal-actions">
          <Button type="button" variant="destructive" disabled={pending} onClick={onDelete}>Delete</Button>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!ready}>{pending ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )
}
