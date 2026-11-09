import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { SlidersHorizontal, X } from 'lucide-react'
import { Button, DatePicker, FormError, Input, Select, StatusDot, classNames } from '@/components/ui'
import { ProgressBar, Timeline } from '@/components/Timeline'
import { useSprints } from '@/api/sprints'
import { useTaskDependencies } from '@/api/taskDependencies'
import { useTasks, useUpdateTask } from '@/api/tasks'
import { useWorkspace } from '@/api/workspace'
import { useStatusesForFolder } from '@/hooks/useBoardStatuses'
import { dependenciesAmong, drivingPath } from '@/data/dependency'
import { flattenFolders, folderChoices } from '@/data/folder'
import { flatTaskRows, ganttLinks } from '@/data/schedule'
import { taskFolderId } from '@/data/task'
import { TASK_STATUSES } from '@/data/task_status'
import { statusForCheckbox } from '@/data/taskLine'
import {
  SCOPE_PROMPT, TASK_EMBED_SCOPES, TASK_EMBED_STATUSES, TASK_EMBED_VIEWS, embedProgress, embedTasks, scopeNameIn, taskEmbedFilters,
  taskEmbedHeading, unscheduledCount, type TaskEmbedAttrs, type TaskEmbedScope, type TaskEmbedStatus, type TaskEmbedView,
} from '@/data/taskEmbed'
import { errorMessage } from '@/util/errorMessage'
import type { Folder, Task, TaskDependency, TaskStatus, Sprint } from '@/types'
import './TaskEmbedPanel.scss'

// How often a list left open on screen asks for the Space's tasks again, so a
// task changed by someone else shows up without a reload.
const REFRESH_MS = 30_000

const NO_TASKS: Task[] = []
const NO_DEPENDENCIES: TaskDependency[] = []
const NO_SPRINTS: Sprint[] = []
const NO_FOLDERS: Folder[] = []

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many)

function Title({ attrs, name }: { attrs: TaskEmbedAttrs; name: string | null }) {
  return <p className="task_embed-title">{taskEmbedHeading(attrs, name)}</p>
}

// A sprint's name comes from the sprint list, which only a sprint embed loads.
function SprintTitle({ attrs }: { attrs: TaskEmbedAttrs }) {
  const { data: sprints = NO_SPRINTS } = useSprints()
  return <Title attrs={attrs} name={sprints.find((s) => s.id === attrs.scopeId)?.title ?? null} />
}

function ScopeTitle({ attrs, documentId }: { attrs: TaskEmbedAttrs; documentId: number | null }) {
  const { data: workspace } = useWorkspace()
  const folders = workspace?.folders ?? NO_FOLDERS
  const name = useMemo(() => scopeNameIn(attrs, folders, documentId), [attrs, folders, documentId])
  return attrs.scope === 'sprint' ? <SprintTitle attrs={attrs} /> : <Title attrs={attrs} name={name} />
}

function SprintPicker({ value, onChange }: { value: number | null; onChange: (id: number | null) => void }) {
  const { data: sprints = NO_SPRINTS } = useSprints()
  return (
    <label className="task_embed-field">
      <span>Sprint</span>
      <Select value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
        <option value="">Choose a sprint…</option>
        {sprints.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
      </Select>
    </label>
  )
}

function FolderPicker({ value, onChange }: { value: number | null; onChange: (id: number | null) => void }) {
  const { data: workspace } = useWorkspace()
  const choices = useMemo(() => folderChoices(flattenFolders(workspace?.folders ?? NO_FOLDERS)), [workspace])
  return (
    <label className="task_embed-field">
      <span>Folder</span>
      <Select value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
        <option value="">Choose a folder…</option>
        {choices.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
      </Select>
    </label>
  )
}

// What to show and from where. A folder or sprint scope starts with nothing
// chosen, and the embed asks for it.
function Settings({ attrs, onChange }: {
  attrs: TaskEmbedAttrs
  onChange: (next: TaskEmbedAttrs) => void
}) {
  const set = (change: Partial<TaskEmbedAttrs>) => onChange({ ...attrs, ...change })
  return (
    <div className="task_embed-settings">
      <label className="task_embed-field">
        <span>Show as</span>
        <Select value={attrs.view} onChange={(e) => set({ view: e.target.value as TaskEmbedView })}>
          {TASK_EMBED_VIEWS.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
        </Select>
      </label>
      <label className="task_embed-field">
        <span>Tasks from</span>
        <Select
          value={attrs.scope}
          onChange={(e) => set({ scope: e.target.value as TaskEmbedScope, scopeId: null })}
        >
          {TASK_EMBED_SCOPES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </Select>
      </label>
      {attrs.scope === 'folder' && <FolderPicker value={attrs.scopeId} onChange={(scopeId) => set({ scopeId })} />}
      {attrs.scope === 'sprint' && <SprintPicker value={attrs.scopeId} onChange={(scopeId) => set({ scopeId })} />}
      <label className="task_embed-field">
        <span>Status</span>
        <Select value={attrs.status} onChange={(e) => set({ status: e.target.value as TaskEmbedStatus })}>
          {TASK_EMBED_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </Select>
      </label>
    </div>
  )
}

// A row per task, every field of it editing the task itself through the same
// update call as a task line: the checkbox marks it done (or back to to do),
// the status and due date change it directly. Divs with list roles rather than
// ul/li: the document's own list styles (ProseMirror.scss) would otherwise add
// bullets. Failed saves surface through the API client's error notice.
function EmbedList({ tasks, editable }: { tasks: Task[]; editable: boolean }) {
  const updateTask = useUpdateTask()
  const statusesFor = useStatusesForFolder()
  const save = (id: number, change: Partial<Task>) => updateTask.mutate({ id, ...change })
  return (
    <div role="list" className="task_embed-list">
      {tasks.map((task) => {
        const statuses = statusesFor(taskFolderId(task))
        const status = statuses[task.status]
        return (
          <div key={task.id} role="listitem" className="task_embed-item">
            <Input
              type="checkbox"
              aria-label={`Mark “${task.title}” done`}
              checked={task.status === 'done'}
              disabled={!editable}
              onChange={(e) => save(task.id, { status: statusForCheckbox(e.target.checked) })}
            />
            <span className={classNames('task_embed-task', task.status === 'done' && 'task_embed-task--done')}>{task.title}</span>
            {editable ? (
              <div className="task_embed-fields">
                <Select
                  aria-label={`Status of “${task.title}”`}
                  className="task_embed-status"
                  value={task.status}
                  onChange={(e) => save(task.id, { status: e.target.value as TaskStatus })}
                >
                  {TASK_STATUSES.map((key) => <option key={key} value={key}>{statuses[key].label}</option>)}
                </Select>
                <DatePicker
                  aria-label={`Due date of “${task.title}”`}
                  className="task_embed-date"
                  value={task.due_date ?? ''}
                  onChange={(e) => save(task.id, { due_date: e.target.value || null })}
                />
              </div>
            ) : (
              <>
                <span className="task_embed-meta">
                  <StatusDot color={status.color} />
                  {status.label}
                </span>
                {task.due_date && <span className="task_embed-meta">{format(parseISO(task.due_date), 'MMM d')}</span>}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

// The tasks as bars, with the links between them and the driving path. Read-only:
// dates are changed on a task or in a folder's Gantt.
function EmbedGantt({ tasks }: { tasks: Task[] }) {
  const { data: allDependencies = NO_DEPENDENCIES } = useTaskDependencies()
  const dependencies = useMemo(() => dependenciesAmong(allDependencies, tasks), [allDependencies, tasks])
  const critical = useMemo(() => drivingPath(tasks, dependencies), [tasks, dependencies])
  const rows = useMemo(() => flatTaskRows(tasks, critical), [tasks, critical])
  const links = useMemo(() => ganttLinks(dependencies), [dependencies])
  const unscheduled = unscheduledCount(tasks)
  return (
    <>
      <Timeline items={rows} links={links} />
      {unscheduled > 0 && (
        <p className="task_embed-note">
          {unscheduled} {plural(unscheduled, 'task has', 'tasks have')} no due date and {plural(unscheduled, 'is', 'are')} not drawn.
        </p>
      )}
    </>
  )
}

// A live task list or Gantt inside a document (the `taskEmbed` node, see
// extensions/TaskEmbed.ts). It reads the Space's tasks, so it always shows
// their current state. While editing, the sliders button opens the settings and
// the X removes the embed from the document.
export default function TaskEmbedPanel({ attrs, documentId, editable, selected = false, onChange, onRemove }: {
  attrs: TaskEmbedAttrs
  // The document the embed sits in, which the "This document" scope lists.
  documentId: number | null
  editable: boolean
  selected?: boolean
  onChange: (next: TaskEmbedAttrs) => void
  onRemove?: () => void
}) {
  // The reader's own request: the API answers with what this person may see in
  // their Space, so nothing about the tasks is kept in the document.
  const filters = taskEmbedFilters(attrs, documentId)
  const { data: tasks = NO_TASKS, isLoading, isError, error, refetch } = useTasks(filters ?? {}, {
    enabled: filters !== null,
    refetchInterval: REFRESH_MS,
  })
  const shown = useMemo(() => embedTasks(tasks, attrs.status), [tasks, attrs.status])
  const progress = embedProgress(tasks)
  // A new embed with nothing to list yet opens its settings so the choice is obvious.
  const [settingsOpen, setSettingsOpen] = useState(editable && filters === null)

  let body
  if (filters === null) {
    body = <p className="task_embed-note">{editable ? SCOPE_PROMPT[attrs.scope] : 'Nothing has been chosen to list here.'}</p>
  } else if (isError) {
    body = (
      <div className="task_embed-error">
        <FormError message={errorMessage(error)} />
        <Button variant="secondary" onClick={() => refetch()}>Try again</Button>
      </div>
    )
  } else if (isLoading) {
    body = <p className="task_embed-note" role="status">Loading tasks…</p>
  } else if (shown.length === 0) {
    body = <p className="task_embed-note">{attrs.status === 'all' ? 'No tasks yet.' : 'No tasks match this filter.'}</p>
  } else {
    body = attrs.view === 'gantt' ? <EmbedGantt tasks={shown} /> : <EmbedList tasks={shown} editable={editable} />
  }

  return (
    <section className={classNames('view-task_embed', selected && 'view-task_embed--selected')} aria-label="Live task list">
      <header className="task_embed-header">
        <ScopeTitle attrs={attrs} documentId={documentId} />
        {filters !== null && progress.total > 0 && (
          <div className="task_embed-progress">
            <span>{progress.done} of {progress.total} done</span>
            <ProgressBar percent={progress.percent} />
          </div>
        )}
        {editable && (
          <div className="task_embed-actions">
            <Button
              variant="ghost"
              aria-label="Task list settings"
              aria-expanded={settingsOpen}
              title="Settings"
              className={classNames('task_embed-icon_button', settingsOpen && 'task_embed-icon_button--active')}
              onClick={() => setSettingsOpen((open) => !open)}
            >
              <SlidersHorizontal className="task_embed-icon" aria-hidden="true" />
            </Button>
            {onRemove && (
              <Button variant="ghost" aria-label="Remove task list" title="Remove" className="task_embed-icon_button" onClick={onRemove}>
                <X className="task_embed-icon" aria-hidden="true" />
              </Button>
            )}
          </div>
        )}
      </header>
      {editable && settingsOpen && <Settings attrs={attrs} onChange={onChange} />}
      {body}
    </section>
  )
}
