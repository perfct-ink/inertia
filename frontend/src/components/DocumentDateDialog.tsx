import { useEffect, useState, type FormEvent } from 'react'
import { Button, DatePicker, Input, Modal } from '@/components/ui'
import { todayISO } from '@/util/date'

// Adds a date to the open document: the day (today, or the one typed as
// `@2026-12-01`) and the label its calendar entry shows (the line it is on).
// The screen saves it; `pending` shows that is happening, and a failed save shows
// the usual error notice and leaves the dialog open to try again.
export default function DocumentDateDialog({ open, defaultDate, defaultLabel, pending, onSubmit, onClose }: {
  open: boolean
  defaultDate?: string | null
  defaultLabel: string
  pending: boolean
  onSubmit: (values: { date: string; label: string }) => void
  onClose: () => void
}) {
  const [date, setDate] = useState(defaultDate || todayISO())
  const [label, setLabel] = useState(defaultLabel)

  useEffect(() => {
    if (!open) return
    setDate(defaultDate || todayISO())
    setLabel(defaultLabel)
  }, [open, defaultDate, defaultLabel])

  const ready = !!date && !pending

  function submit(e: FormEvent) {
    e.preventDefault()
    if (ready) onSubmit({ date, label })
  }

  return (
    <Modal open={open} title="Add a date" description="It goes on the calendar and shows here as a chip." onClose={onClose}>
      <form onSubmit={submit} className="ui-modal-form">
        <DatePicker aria-label="Date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input aria-label="Label on the calendar" placeholder="Label on the calendar" value={label} onChange={(e) => setLabel(e.target.value)} />
        <div className="ui-modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!ready}>{pending ? 'Adding…' : 'Add date'}</Button>
        </div>
      </form>
    </Modal>
  )
}
