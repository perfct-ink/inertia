import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { Button, FormError, Input, Select } from '@/components/ui'
import { Timeline, type TimelineMilestone } from '@/components/Timeline'
import { useUpdateTask } from '@/api/tasks'
import { useUpdateEpic } from '@/api/epics'
import { useUpdateFolder } from '@/api/workspace'
import { useCreateTaskDependency, useDeleteTaskDependency, useTaskDependencies } from '@/api/taskDependencies'
import { ganttTaskKey, groupGanttRows, type Scheduled } from '@/data/schedule'
import { DEPENDENCY_KINDS, DEPENDENCY_LABEL, DEPENDENCY_MODES, DEPENDENCY_MODE_LABEL, drivingPath, planReschedule } from '@/data/dependency'
import { errorMessage } from '@/util/errorMessage'
import type { DependencyKind, DependencyMode, Epic, Task, TaskDependency } from '@/types'
import './GanttPane.scss'

// The folder's Gantt tab: epics and dated tasks, dependency arrows between
// this folder's tasks (PM-13), the driving path highlighted (PM-15), and a
// small editor for the links underneath.
export default function GanttPane({ folderId, dependencyMode, epics, tasks, milestones }: {
  folderId: number
  dependencyMode: DependencyMode
  epics: Epic[]
  tasks: Task[]
  milestones: TimelineMilestone[]
}) {
  const { data: allDependencies = [] } = useTaskDependencies()
  const [showCritical, setShowCritical] = useState(true)
  const qc = useQueryClient()
  const updateTask = useUpdateTask()
  const updateEpic = useUpdateEpic()
  const updateFolder = useUpdateFolder()
  const [moveError, setMoveError] = useState<string | null>(null)

  // Rows are keyed `task-<id>` / `epic-<id>`; a task's end is due_date, an epic's is target_date.
  // Task moves go through the folder's dependency mode (PM-14), which may block
  // the move or add the tasks that have to shift with it.
  function reschedule(item: Scheduled, startDate: string, endDate: string) {
    const id = Number(item.key?.split('-')[1])
    // The chart reads from the folder's contents, which the update hooks don't refresh.
    const options = { onSettled: () => qc.invalidateQueries({ queryKey: ['folder-contents'] }) }
    setMoveError(null)
    if (item.key?.startsWith('task-')) {
      const plan = planReschedule(tasks, dependencies, id, startDate, endDate, dependencyMode)
      if ('error' in plan) {
        setMoveError(plan.error)
        return
      }
      plan.updates.forEach((u) => updateTask.mutate(u, options))
    } else if (item.key?.startsWith('epic-')) {
      updateEpic.mutate({ id, start_date: startDate, target_date: endDate }, options)
    }
  }

  const taskIds = useMemo(() => new Set(tasks.map((t) => t.id)), [tasks])
  // Only links with both ends in this folder; the rest belong to other charts.
  const dependencies = useMemo(
    () => allDependencies.filter((d) => taskIds.has(d.predecessor_id) && taskIds.has(d.successor_id)),
    [allDependencies, taskIds],
  )
  const critical = useMemo(
    () => (showCritical ? drivingPath(tasks, dependencies) : new Set<number>()),
    [showCritical, tasks, dependencies],
  )
  const links = dependencies.map((d) => ({ from: ganttTaskKey(d.predecessor_id), to: ganttTaskKey(d.successor_id), kind: d.kind }))

  return (
    <div className="view-gantt_pane">
      <div className="gantt_pane-toolbar">
        <label className="gantt_pane-toggle">
          <Input type="checkbox" checked={showCritical} onChange={(e) => setShowCritical(e.target.checked)} />
          Highlight critical path
        </label>
        <Select
          aria-label="When a task moves"
          value={dependencyMode}
          onChange={(e) => updateFolder.mutate(
            { id: folderId, dependency_mode: e.target.value as DependencyMode },
            { onSuccess: () => qc.invalidateQueries({ queryKey: ['folder-contents'] }) },
          )}
          className="gantt_pane-select"
        >
          {DEPENDENCY_MODES.map((m) => <option key={m} value={m}>{DEPENDENCY_MODE_LABEL[m]}</option>)}
        </Select>
      </div>
      <FormError message={moveError} />
      <Timeline milestones={milestones} items={groupGanttRows(epics, tasks, critical)} links={links} onReschedule={reschedule} />
      <DependencyEditor tasks={tasks} dependencies={dependencies} />
    </div>
  )
}

function DependencyEditor({ tasks, dependencies }: { tasks: Task[]; dependencies: TaskDependency[] }) {
  const createDependency = useCreateTaskDependency()
  const deleteDependency = useDeleteTaskDependency()
  const [predecessorId, setPredecessorId] = useState('')
  const [successorId, setSuccessorId] = useState('')
  const [kind, setKind] = useState<DependencyKind>('finish_to_start')
  const titles = new Map(tasks.map((t) => [t.id, t.title]))

  function add() {
    if (!predecessorId || !successorId) return
    createDependency.mutate(
      { predecessor_id: Number(predecessorId), successor_id: Number(successorId), kind },
      { onSuccess: () => { setPredecessorId(''); setSuccessorId('') } },
    )
  }

  if (tasks.length < 2) return null

  return (
    <section className="gantt_pane-deps" aria-labelledby="gantt-deps-heading">
      <h2 id="gantt-deps-heading" className="gantt_pane-heading">Dependencies</h2>
      {dependencies.length === 0 && <p className="gantt_pane-muted">No dependencies yet.</p>}
      <ul className="gantt_pane-list">
        {dependencies.map((d) => (
          <li key={d.id} className="gantt_pane-item">
            <span className="gantt_pane-item-text">
              <strong>{titles.get(d.successor_id)}</strong> waits on <strong>{titles.get(d.predecessor_id)}</strong>
              <span className="gantt_pane-muted"> · {DEPENDENCY_LABEL[d.kind]}</span>
            </span>
            <Button
              onClick={() => deleteDependency.mutate(d.id)}
              aria-label={`Remove dependency of ${titles.get(d.successor_id)} on ${titles.get(d.predecessor_id)}`}
              className="gantt_pane-remove"
            >
              <X className="gantt_pane-icon" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="gantt_pane-form">
        <Select aria-label="Task that waits" value={successorId} onChange={(e) => setSuccessorId(e.target.value)} className="gantt_pane-select">
          <option value="">Task…</option>
          {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </Select>
        <span className="gantt_pane-muted">waits on</span>
        <Select aria-label="Task it waits on" value={predecessorId} onChange={(e) => setPredecessorId(e.target.value)} className="gantt_pane-select">
          <option value="">Task…</option>
          {tasks.filter((t) => String(t.id) !== successorId).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </Select>
        <Select aria-label="Link type" value={kind} onChange={(e) => setKind(e.target.value as DependencyKind)} className="gantt_pane-select">
          {DEPENDENCY_KINDS.map((k) => <option key={k} value={k}>{DEPENDENCY_LABEL[k]}</option>)}
        </Select>
        <Button variant="primary" onClick={add} disabled={!predecessorId || !successorId || createDependency.isPending}>
          Add
        </Button>
      </div>
      <FormError message={createDependency.isError ? errorMessage(createDependency.error) : null} />
    </section>
  )
}
