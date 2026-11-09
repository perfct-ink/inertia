import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Button, FormError, Modal, Select, Textarea } from '@/components/ui'
import { CheckInStatusBadge } from '@/components/tasks/CheckInStatusBadge'
import { useAddTaskCheckIn, useTaskCheckIns } from '@/api/tasks'
import { CHECK_IN_STATUSES, CHECK_IN_STATUS_LABEL } from '@/data/checkIn'
import { recurrenceLabel } from '@/data/recurrence'
import { errorMessage } from '@/util/errorMessage'
import type { CheckInStatus, Task } from '@/types'

// An ongoing task's check-in: pick a status, add a note if there is one, and see the log so far (newest first).
// The status starts at the latest one; mount it with `key` set to the task so each task starts fresh.
export default function TaskCheckInDialog({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { data: checkIns = [], isLoading } = useTaskCheckIns(task?.id ?? 0, task !== null)
  const add = useAddTaskCheckIn(task?.id ?? 0)
  const [status, setStatus] = useState<CheckInStatus>(task?.check_in_status ?? 'on_track')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const schedule = recurrenceLabel(task?.check_in_recurrence)

  function submit() {
    setError(null)
    add.mutate({ status, note: note.trim() || undefined }, { onSuccess: () => setNote(''), onError: (e) => setError(errorMessage(e)) })
  }

  return (
    <Modal
      open={task !== null}
      title={`Check in: ${task?.title ?? ''}`}
      description={schedule ? `Asked to check in: ${schedule.toLowerCase()}.` : undefined}
      onClose={onClose}
    >
      <label>Status
        <Select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as CheckInStatus)}>
          {CHECK_IN_STATUSES.map((s) => <option key={s} value={s}>{CHECK_IN_STATUS_LABEL[s]}</option>)}
        </Select>
      </label>
      <Textarea aria-label="Note (optional)" placeholder="Add a note (optional)" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      <FormError message={error} />
      <div className="ui-modal-actions">
        <Button variant="primary" onClick={submit} disabled={add.isPending}>Check in</Button>
      </div>
      {isLoading && <p>Loading…</p>}
      {!isLoading && checkIns.length === 0 && <p>No check-ins yet.</p>}
      <ul>
        {[...checkIns].reverse().map((c) => (
          <li key={c.id}>
            <CheckInStatusBadge status={c.status} />
            {c.note && <> {c.note}</>}
            <span className="tasks-meta"> · {format(parseISO(c.created_at), 'MMM d, yyyy')}{c.author_name ? ` · ${c.author_name}` : ''}</span>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
