import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Button, Modal, Textarea } from '@/components/ui'
import { useCreateTaskCheckIn, useTaskCheckIns } from '@/api/tasks'
import type { Task } from '@/types'

// An ongoing task's updates: the log so far and a box for the next one.
export default function TaskCheckInDialog({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { data: checkIns = [] } = useTaskCheckIns(task?.id ?? 0, task !== null)
  const create = useCreateTaskCheckIn(task?.id ?? 0)
  const [body, setBody] = useState('')

  function submit() {
    const text = body.trim()
    if (text) create.mutate(text, { onSuccess: () => setBody('') })
  }

  return (
    <Modal open={task !== null} title={`Update: ${task?.title ?? ''}`} description={task?.check_in_every_days ? `Checked in every ${task.check_in_every_days} days.` : undefined} onClose={onClose}>
      <Textarea aria-label="Your update" placeholder="What's the update?" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="ui-modal-actions">
        <Button variant="primary" onClick={submit} disabled={!body.trim() || create.isPending}>Add update</Button>
      </div>
      <ul>
        {checkIns.length === 0 && <li>No updates yet.</li>}
        {[...checkIns].reverse().map((c) => (
          <li key={c.id}>{c.body} <span className="tasks-meta">· {format(parseISO(c.created_at), 'MMM d, yyyy')}{c.author_name ? ` · ${c.author_name}` : ''}</span></li>
        ))}
      </ul>
    </Modal>
  )
}
