import { useMemo, useState, type ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { X } from 'lucide-react'
import { Button, FormError, Input, Select } from '@/components/ui'
import { useCreateTaskDependency, useDeleteTaskDependency } from '@/api/taskDependencies'
import { useTaskSearch } from '@/api/tasks'
import { DEPENDENCY_KINDS, DEPENDENCY_LABEL, NO_PROJECT, externalEnd, linkCandidates, type LinkCandidates } from '@/data/dependency'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { errorMessage } from '@/util/errorMessage'
import type { DependencyKind, Folder, Task, TaskDependency } from '@/types'

// The links under a folder's Gantt chart: the ones between its own tasks, then
// the ones to a task in another project (listed with that project and a note
// when the dates break the link, but not drawn: the chart only has this
// folder's tasks), and a form to add one. Either side of a new link can be a
// task found by searching the whole Space, as long as the other is on this
// chart.
export function DependencyEditor({ tasks, dependencies, externalDependencies, folders }: {
  tasks: Task[]
  dependencies: TaskDependency[]
  externalDependencies: TaskDependency[]
  folders: Folder[]
}) {
  const createDependency = useCreateTaskDependency()
  const deleteDependency = useDeleteTaskDependency()
  const [predecessorId, setPredecessorId] = useState('')
  const [successorId, setSuccessorId] = useState('')
  const [kind, setKind] = useState<DependencyKind>('finish_to_start')
  const [search, setSearch] = useState('')
  // Tasks picked from a search stay in the pickers when the search changes.
  const [picked, setPicked] = useState<Task[]>([])
  const query = useDebouncedValue(search.trim())
  const { data: found = [], isFetching } = useTaskSearch(query)

  const onChart = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const groups = linkCandidates([...picked, ...found], folders, new Set(onChart.keys()))
  const titles = new Map(tasks.map((t) => [t.id, t.title]))
  const removeLink = (id: number) => deleteDependency.mutate(id)

  function choose(set: (id: string) => void, id: string) {
    set(id)
    const task = found.find((t) => String(t.id) === id)
    if (task) setPicked((current) => (current.some((t) => t.id === task.id) ? current : [...current, task]))
  }

  const bothOutside = !!predecessorId && !!successorId && !onChart.has(Number(predecessorId)) && !onChart.has(Number(successorId))

  function add() {
    if (!predecessorId || !successorId || bothOutside) return
    createDependency.mutate(
      { predecessor_id: Number(predecessorId), successor_id: Number(successorId), kind },
      { onSuccess: () => { setPredecessorId(''); setSuccessorId(''); setPicked([]); setSearch('') } },
    )
  }

  if (tasks.length === 0 && externalDependencies.length === 0) return null

  return (
    <section className="gantt_pane-deps" aria-labelledby="gantt-deps-heading">
      <h2 id="gantt-deps-heading" className="gantt_pane-heading">Dependencies</h2>
      {dependencies.length === 0 && externalDependencies.length === 0 && <p className="gantt_pane-muted">No dependencies yet.</p>}
      <ul className="gantt_pane-list">
        {dependencies.map((d) => {
          const [waiting, waitedOn] = [titles.get(d.successor_id), titles.get(d.predecessor_id)]
          return (
            <DependencyRow key={d.id} dependency={d} onRemove={removeLink} waiting={<strong>{waiting}</strong>} waitedOn={<strong>{waitedOn}</strong>} removeLabel={`Remove dependency of ${waiting} on ${waitedOn}`} />
          )
        })}
      </ul>
      {externalDependencies.length > 0 && (
        <>
          <h3 className="gantt_pane-subheading">Other projects</h3>
          <ul className="gantt_pane-list">
            {externalDependencies.map((d) => {
              const end = externalEnd(d, onChart, folders)
              const ownId = end.isPredecessor ? d.successor_id : d.predecessor_id
              const otherId = end.isPredecessor ? d.predecessor_id : d.successor_id
              const ownTitle = titles.get(ownId) ?? `Task #${ownId}`
              const otherTitle = end.task?.title ?? `Task #${otherId}`
              const own = <strong>{ownTitle}</strong>
              const other = (
                <>
                  <strong>{otherTitle}</strong>
                  {end.project && <span className="gantt_pane-muted"> ({end.project})</span>}
                </>
              )
              const due = end.task?.due_date
              // The successor waits on the predecessor; the task on the chart is one of the two.
              const [waiting, waitedOn] = end.isPredecessor ? [ownTitle, otherTitle] : [otherTitle, ownTitle]
              return (
                <DependencyRow
                  key={d.id}
                  dependency={d}
                  onRemove={removeLink}
                  waiting={end.isPredecessor ? own : other}
                  waitedOn={end.isPredecessor ? other : own}
                  removeLabel={`Remove dependency of ${waiting} on ${waitedOn}`}
                  detail={due ? `${otherTitle} due ${format(parseISO(due), 'MMM d')}` : null}
                  warning={end.brokenByDays > 0 ? `Dates break this link by ${end.brokenByDays} ${end.brokenByDays === 1 ? 'day' : 'days'}` : null}
                />
              )
            })}
          </ul>
        </>
      )}
      <div className="gantt_pane-form">
        <Select aria-label="Task that waits" value={successorId} onChange={(e) => choose(setSuccessorId, e.target.value)} className="gantt_pane-select">
          <option value="">Task…</option>
          {taskOptions(tasks, groups)}
        </Select>
        <span className="gantt_pane-muted">waits on</span>
        <Select aria-label="Task it waits on" value={predecessorId} onChange={(e) => choose(setPredecessorId, e.target.value)} className="gantt_pane-select">
          <option value="">Task…</option>
          {taskOptions(tasks, groups, successorId)}
        </Select>
        <Select aria-label="Link type" value={kind} onChange={(e) => setKind(e.target.value as DependencyKind)} className="gantt_pane-select">
          {DEPENDENCY_KINDS.map((k) => <option key={k} value={k}>{DEPENDENCY_LABEL[k]}</option>)}
        </Select>
        <Button variant="primary" onClick={add} disabled={!predecessorId || !successorId || bothOutside || createDependency.isPending}>
          Add
        </Button>
      </div>
      <div className="gantt_pane-form">
        <Input
          type="search"
          aria-label="Find a task in another project"
          placeholder="Find a task in another project"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="gantt_pane-search"
        />
        {query.length >= 2 && !isFetching && groups.length === 0 && <span className="gantt_pane-muted">No tasks match.</span>}
      </div>
      {bothOutside && <p className="gantt_pane-muted">One of the two tasks has to be on this chart.</p>}
      <FormError message={createDependency.isError ? errorMessage(createDependency.error) : null} />
    </section>
  )
}

function DependencyRow({ dependency, waiting, waitedOn, removeLabel, detail, warning, onRemove }: {
  dependency: TaskDependency
  waiting: ReactNode
  waitedOn: ReactNode
  removeLabel: string
  detail?: string | null
  warning?: string | null
  onRemove: (id: number) => void
}) {
  return (
    <li className="gantt_pane-item">
      <span className="gantt_pane-item-text">
        {waiting} waits on {waitedOn}
        <span className="gantt_pane-muted"> · {DEPENDENCY_LABEL[dependency.kind]}{detail && ` · ${detail}`}</span>
        {warning && <span className="gantt_pane-warning"> · {warning}</span>}
      </span>
      <Button onClick={() => onRemove(dependency.id)} aria-label={removeLabel} className="gantt_pane-remove">
        <X className="gantt_pane-icon" aria-hidden="true" />
      </Button>
    </li>
  )
}

// This folder's tasks, then (when a search found any) the others, one group per
// project with the project in each name too, because the styled Select lists
// only the options. Called as a function, not rendered as a component: the
// Select reads its <option> children, which a component would hide from it.
function taskOptions(tasks: Task[], groups: LinkCandidates[], except?: string) {
  const keep = (t: Task) => String(t.id) !== except
  return (
    <>
      {tasks.filter(keep).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
      {groups.map((group) => (
        <optgroup key={group.project} label={group.project}>
          {group.tasks.filter(keep).map((t) => (
            <option key={t.id} value={t.id}>{group.project === NO_PROJECT ? t.title : `${t.title} (${group.project})`}</option>
          ))}
        </optgroup>
      ))}
    </>
  )
}
