import { useState } from 'react'
import { Button, FormError, Input, Modal, Select, Textarea } from '@/components/ui'
import { useUpdateTask } from '@/api/tasks'
import { useEpics } from '@/api/epics'
import { useSprints } from '@/api/sprints'
import { useMilestones } from '@/api/milestones'
import { errorMessage } from '@/util/errorMessage'
import { taskChanges, taskDraft, taskDraftError, TASK_STATUSES, STATUS_LABEL, type TaskDraft } from '@/data/task'
import type { Task } from '@/types'

// Edit a task after it was created: title, description, status, dates, epic,
// sprint and milestone. Only changed fields are sent.
export function TaskDetail({ task, onClose }: { task: Task; onClose: () => void }) {
  const update = useUpdateTask()
  const { data: epics = [] } = useEpics()
  const { data: sprints = [] } = useSprints()
  const { data: milestones = [] } = useMilestones()
  const [draft, setDraft] = useState<TaskDraft>(() => taskDraft(task))
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const invalid = taskDraftError(draft)
  const changes = taskChanges(task, draft)
  const dirty = Object.keys(changes).length > 0

  function save() {
    setError(null)
    update.mutate({ id: task.id, ...changes }, { onSuccess: onClose, onError: (e) => setError(errorMessage(e)) })
  }

  return (
    <Modal open title="Task" description="Change this task's details." onClose={onClose}>
      <label>Title<Input aria-label="Task title" value={draft.title} onChange={(e) => set('title', e.target.value)} /></label>
      <label>Description<Textarea aria-label="Task description" rows={4} value={draft.description} onChange={(e) => set('description', e.target.value)} /></label>
      <label>Status
        <Select aria-label="Task status" value={draft.status} onChange={(e) => set('status', e.target.value as Task['status'])}>
          {TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </Select>
      </label>
      <label>Start date<Input type="date" aria-label="Start date" value={draft.start_date} onChange={(e) => set('start_date', e.target.value)} /></label>
      <label>Due date<Input type="date" aria-label="Due date" value={draft.due_date} onChange={(e) => set('due_date', e.target.value)} /></label>
      <label>Epic
        <Select aria-label="Epic" value={draft.epic_id} onChange={(e) => set('epic_id', e.target.value)}>
          <option value="">No epic</option>
          {epics.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
        </Select>
      </label>
      <label>Sprint
        <Select aria-label="Sprint" value={draft.sprint_id} onChange={(e) => set('sprint_id', e.target.value)}>
          <option value="">No sprint</option>
          {sprints.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
        </Select>
      </label>
      <label>Milestone
        <Select aria-label="Milestone" value={draft.milestone_id} onChange={(e) => set('milestone_id', e.target.value)}>
          <option value="">No milestone</option>
          {milestones.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
        </Select>
      </label>
      <FormError message={error ?? invalid} />
      <Button variant="primary" disabled={!dirty || !!invalid || update.isPending} onClick={save}>Save</Button>
      <Button onClick={onClose}>Cancel</Button>
    </Modal>
  )
}
