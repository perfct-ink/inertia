import { useState } from 'react'
import { format } from 'date-fns'
import { Button, Input, Modal, Select } from '@/components/ui'
import { EVENT_TYPE_LABEL } from '@/data/documentEvent'
import type { WorkspaceEvent } from '@/types'

// Asks for the event to add to the calendar from the open document: a title, a
// date and whether it is a deadline or a milestone.
export default function DocumentEventDialog({ open, onSubmit, onClose }: {
  open: boolean
  onSubmit: (event: { title: string; date: string; event_type: WorkspaceEvent['event_type'] }) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [eventType, setEventType] = useState<WorkspaceEvent['event_type']>('milestone')

  function submit() {
    const trimmed = title.trim()
    if (!trimmed || !date) return
    onSubmit({ title: trimmed, date, event_type: eventType })
    setTitle('')
  }

  return (
    <Modal open={open} title="Add an event" description="It goes on the calendar and shows here as a chip." onClose={onClose}>
      <Input autoFocus aria-label="Event title" placeholder="e.g. Beta launch" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} />
      <Input type="date" aria-label="Event date" value={date} onChange={(e) => setDate(e.target.value)} />
      <Select aria-label="Event type" value={eventType} onChange={(e) => setEventType(e.target.value as WorkspaceEvent['event_type'])}>
        {(Object.keys(EVENT_TYPE_LABEL) as WorkspaceEvent['event_type'][]).map((t) => <option key={t} value={t}>{EVENT_TYPE_LABEL[t]}</option>)}
      </Select>
      <div className="ui-modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!title.trim() || !date} onClick={submit}>Add event</Button>
      </div>
    </Modal>
  )
}
