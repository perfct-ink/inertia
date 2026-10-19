import { format, parseISO } from 'date-fns'
import { Modal } from '@/components/ui'
import { useTaskStatusChanges } from '@/api/tasks'
import { statusChangeLabel } from '@/data/task'
import type { Task } from '@/types'

// A task's status history: when it changed, from what to what, and who did it.
export default function TaskHistoryDialog({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { data: changes = [], isLoading } = useTaskStatusChanges(task?.id ?? 0, task !== null)

  return (
    <Modal open={task !== null} title={`History: ${task?.title ?? ''}`} onClose={onClose}>
      {isLoading && <p>Loading…</p>}
      {!isLoading && changes.length === 0 && <p>No recorded changes. Changes made before history was kept are not listed.</p>}
      <ul>
        {changes.map((change) => (
          <li key={change.id}>
            {statusChangeLabel(change)}
            <span className="tasks-meta"> · {format(parseISO(change.created_at), 'MMM d, yyyy h:mm a')}{change.changed_by_name ? ` · ${change.changed_by_name}` : ''}</span>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
