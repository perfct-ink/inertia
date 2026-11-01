import { useState, type FormEvent } from 'react'
import { Button, FormError, Modal } from '@/components/ui'
import { useUpdateTask } from '@/api/tasks'
import { draftChanges, draftError, draftFromTask, type FieldDraft } from '@/data/taskField'
import { errorMessage } from '@/util/errorMessage'
import type { Task, TaskField } from '@/types'
import { TaskFieldInputs } from './TaskFieldInputs'

// Edit one task's custom field values. Only the values that changed are sent,
// and a failed save keeps the dialog open with the reason.
export function TaskFieldValuesModal({ task, fields, onClose }: { task: Task; fields: TaskField[]; onClose: () => void }) {
  const update = useUpdateTask()
  const [draft, setDraft] = useState<FieldDraft>(() => draftFromTask(fields, task))
  const [error, setError] = useState<string | null>(null)
  const invalid = draftError(fields, draft)
  const changes = draftChanges(fields, task, draft)
  const dirty = Object.keys(changes).length > 0

  function save(e: FormEvent) {
    e.preventDefault()
    if (!dirty || invalid) return
    setError(null)
    update.mutate({ id: task.id, custom_fields: changes }, { onSuccess: onClose, onError: (err) => setError(errorMessage(err)) })
  }

  return (
    <Modal open title="Custom fields" description={task.title} onClose={onClose}>
      <form onSubmit={save}>
        <TaskFieldInputs fields={fields} draft={draft} onChange={(id, raw) => setDraft((d) => ({ ...d, [id]: raw }))} />
        <FormError message={error ?? invalid} />
        <div className="ui-modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!dirty || !!invalid || update.isPending}>Save</Button>
        </div>
      </form>
    </Modal>
  )
}
