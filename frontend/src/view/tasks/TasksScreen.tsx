import { Button, IconButton, Input, Select, StatusDot, Tab, Tabs, classNames, DatePicker } from '@/components/ui'
import { SendToAgent } from '@/components/workspace/SendToAgent'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, X, ArrowRight, Play, Loader2, Search, Filter, Target, SlidersHorizontal, Palette, Repeat, History, Pencil, Paperclip } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  MouseSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import SprintHeader from '@/components/SprintHeader'
import SavedViews from '@/components/SavedViews'
import { TASK_PRIORITIES, estimateLabel, pointsLabel, priorityLabel, TASK_KINDS, KIND_LABEL, kindOf, parseTaskBoardConfig, type TaskBoardConfig, epicLanes, epicLaneKey, laneEpicId, boardCellId, parseBoardCell, type EpicLane } from '@/data/task'
import { RECURRENCE_OPTIONS, recurrenceLabel } from '@/data/recurrence'
import TaskHistoryDialog from '@/components/TaskHistoryDialog'
import { TaskDetail } from '@/components/tasks/TaskDetail'
import { TaskFiles } from '@/components/tasks/TaskFiles'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, type TaskFilters } from '@/api/tasks'
import { useWorkspace } from '@/api/workspace'
import { canWriteWorkspace } from '@/api/workspaces'
import { useEpics } from '@/api/epics'
import { useSprints } from '@/api/sprints'
import { useMilestones } from '@/api/milestones'
import { useTaskFields } from '@/api/taskFields'
import { TaskFieldChips } from '@/components/task-fields/TaskFieldChips'
import { TaskFieldPeople } from '@/components/task-fields/taskFieldPeople'
import { TaskFieldsDialog } from '@/components/task-fields/TaskFieldsDialog'
import { ManageTaskFieldsDialog } from '@/components/task-fields/ManageTaskFieldsDialog'
import type { Task, TaskField, Epic, Sprint, Milestone, TaskStatus, TaskStatusColor, TaskPriority, TaskKind, WorkspaceMember } from '@/types'
import { TaskTimer } from './TaskTimer'
import { progressById, type Progress } from '@/data/task'
import { PeoplePicker } from '@/components/people/PeoplePicker'
import { initials } from '@/data/person'
import { useWorkspaceMembers } from '@/api/workspaceMembers'
import './TasksScreen.scss'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useBoardStatuses } from '@/hooks/useBoardStatuses'
import { StatusSettings } from '@/components/workspace/StatusSettings'
import { BOARD_STATUSES, NEXT_STATUS, TASK_STATUSES, nextStatusLabel } from '@/data/task_status'
import { flattenFolders } from '@/data/folder'
import { usePaths } from '@/hooks/usePaths'

// Stable default so the server → local sync effect doesn't re-run every render while the query has no data.
const NO_TASKS: Task[] = []

// ── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  task: Task
  onDelete?: () => void
  onNext: (() => void) | null
  // Name of the status onNext moves the task to.
  nextLabel?: string | null
  onNavigate: () => void
  onEdit?: () => void
  epicTitle?: string
  progress?: Progress
  assignees?: WorkspaceMember[]
  overlay?: boolean
  // The Space's custom task fields, shown as chips; the edit button opens them.
  fields?: TaskField[]
  onEditFields?: () => void
  onHistory?: () => void
  // Opens the task's attached files.
  onFiles?: () => void
}

function TaskCard({ task, onNext, nextLabel, onNavigate, onEdit, epicTitle, assignees = [], progress, overlay, onHistory, fields = [], onEditFields, onFiles }: Omit<CardProps, 'onDelete'>) {
  return (
    <div className={classNames('tasks-card', overlay && 'tasks-card--overlay')}>
      <div className="tasks-card_title_row">
        <p className="tasks-card_title">{task.title}</p>
        {kindOf(task) !== 'task' && (
          <span className={classNames('tasks-kind', `tasks-kind--${kindOf(task)}`)}>{KIND_LABEL[kindOf(task)]}</span>
        )}
        {onEdit && !overlay && (
          <IconButton onClick={onEdit} className="tasks-next" label={`Edit ${task.title}`} title="Edit task">
            <Pencil className="tasks-icon" />
          </IconButton>
        )}
      </div>
      {epicTitle && (
        <div className="tasks-epic tasks-epic--card">
          <Target className="tasks-icon tasks-icon--sm" />
          <span className="tasks-epic_title">{epicTitle}</span>
        </div>
      )}
      <TaskFieldChips fields={fields} task={task} />
      {progress && (
        <div className="tasks-progress" role="progressbar" aria-label="Subtask progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}>
          <div className="tasks-progress_bar" style={{ width: `${progress.percent}%` }} />
          <span className="tasks-progress_text">{progress.done}/{progress.total} subtasks</span>
        </div>
      )}
      {!overlay && <TaskTimer task={task} />}
      {assignees.length > 0 && (
        <ul className="tasks-people" aria-label="Assignees">
          {assignees.map((m) => (
            <li key={m.user_id} className="tasks-avatar" title={m.user.name}>{initials(m.user.name)}</li>
          ))}
        </ul>
      )}
      <div className="tasks-card_footer">
        {priorityLabel(task.priority) && <span className={`tasks-priority tasks-priority--${task.priority}`}>{priorityLabel(task.priority)}</span>}
        {pointsLabel(task) && <span className="tasks-meta">{pointsLabel(task)}</span>}
        {estimateLabel(task.estimate_hours) && <span className="tasks-meta">{estimateLabel(task.estimate_hours)}</span>}
        {recurrenceLabel(task.recurrence) && (
          <span className="tasks-repeat" title={`Repeats: ${recurrenceLabel(task.recurrence)}`}>
            <Repeat className="tasks-icon tasks-icon--sm" aria-hidden="true" />
            {recurrenceLabel(task.recurrence)}
          </span>
        )}
        {task.document && (
          <Button
            onClick={onNavigate}
            className="tasks-doc_link"
          >
            {task.document.title}
          </Button>
        )}
        <div className="tasks-card_actions">
          {onEditFields && fields.length > 0 && !overlay && (
            <IconButton
              onClick={onEditFields}
              title="Edit fields"
              label={`Edit fields of ${task.title}`}
            >
              <SlidersHorizontal className="tasks-icon" />
            </IconButton>
          )}
          {onFiles && !overlay && (
            <Button onClick={onFiles} className="tasks-files" title="Attached files" aria-label={`Files of ${task.title}`}>
              <Paperclip className="tasks-icon" />
              {!!task.file_ids?.length && <span className="tasks-meta">{task.file_ids.length}</span>}
            </Button>
          )}
          {!overlay && <SendToAgent subjectType="task" subjectId={task.id} title={task.title} className="tasks-next" />}
          {onHistory && !overlay && (
            <IconButton onClick={onHistory} className="tasks-next" title="Status history" label={`Status history of ${task.title}`}>
              <History className="tasks-icon" />
            </IconButton>
          )}
          {onNext && !overlay && (
            <IconButton
              onClick={onNext}
              className="tasks-next"
              title={`Move to ${nextLabel}`}
              label={`Move to ${nextLabel}`}
            >
              <ArrowRight className="tasks-icon" />
            </IconButton>
          )}
        </div>
      </div>
    </div>
  )
}

function SortableCard(props: Omit<CardProps, 'onDelete'>) {
  const { setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0 : 1 }}
      className="tasks-sortable"
    >
      <TaskCard {...props} />
    </div>
  )
}

// ── Column ────────────────────────────────────────────────────────────────────

// One column of the board, or of a swimlane: `cellId` is its drop target (see
// boardCellId in data/task.ts).
function KanbanColumn({ cellId, label, color, tasks, children }: {
  cellId: string
  label: string
  color: TaskStatusColor
  tasks: Task[]
  children: React.ReactNode
}) {
  const { setNodeRef } = useDroppable({ id: cellId })
  return (
    <div className="tasks-column">
      <div className="tasks-column_header">
        <StatusDot color={color} />
        <span className="tasks-column_label">{label}</span>
        <span className="tasks-count">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="tasks-column_body">
          {children}
        </div>
      </SortableContext>
    </div>
  )
}

// ── AddTaskInput ──────────────────────────────────────────────────────────────

interface NewTaskFields {
  title: string
  startDate: string
  dueDate: string
  epicId?: number
  sprintId?: number
  milestoneId?: number
  priority?: TaskPriority
  estimateHours?: number
  storyPoints?: number
  recurrence?: string
  kind: TaskKind
  assignee_ids: number[]
  watcher_ids: number[]
}

interface AddTaskInputProps {
  onAdd: (fields: NewTaskFields) => void
  onCancel: () => void
  epics: Epic[]
  sprints: Sprint[]
  milestones: Milestone[]
  members: WorkspaceMember[]
  // The epic a new task starts under (the swimlane it is added in).
  defaultEpicId?: number | null
}

function AddTaskInput({ onAdd, onCancel, epics, sprints, milestones, members, defaultEpicId }: AddTaskInputProps) {
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [epicId, setEpicId] = useState(defaultEpicId ? String(defaultEpicId) : '')
  const [sprintId, setSprintId] = useState('')
  const [milestoneId, setMilestoneId] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('none')
  const [estimate, setEstimate] = useState('')
  const [points, setPoints] = useState('')
  const [recurrence, setRecurrence] = useState('')
  const [kind, setKind] = useState<TaskKind>('task')
  const [assigneeIds, setAssigneeIds] = useState<number[]>([])
  const [watcherIds, setWatcherIds] = useState<number[]>([])
  const titleRef = useRef('')
  const containerRef = useRef<HTMLDivElement>(null)

  function commit() {
    if (titleRef.current.trim()) {
      onAdd({
        title: titleRef.current.trim(),
        startDate,
        dueDate,
        epicId: epicId ? Number(epicId) : undefined,
        sprintId: sprintId ? Number(sprintId) : undefined,
        milestoneId: milestoneId ? Number(milestoneId) : undefined,
        priority: priority === 'none' ? undefined : priority,
        estimateHours: estimate === '' ? undefined : Number(estimate),
        storyPoints: points === '' ? undefined : Number(points),
        recurrence: recurrence || undefined,
        kind,
        assignee_ids: assigneeIds,
        watcher_ids: watcherIds,
      })
    } else onCancel()
  }

  // Only commit once focus leaves the whole row — otherwise tabbing from
  // the title into the date (or the epic picker, when present) would fire
  // this input's own onBlur and submit before the other fields are set.
  function handleBlur(e: React.FocusEvent) {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) commit()
  }

  return (
    <div ref={containerRef} className="tasks-add_row">
      <Input
        autoFocus
        placeholder="Task title…"
        className="tasks-add_field tasks-add_field--title"
        value={title}
        onChange={(e) => { setTitle(e.target.value); titleRef.current = e.target.value }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') onCancel()
        }}
        onBlur={handleBlur}
      />
      <DatePicker
        aria-label="Start date"
        className="tasks-add_field"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        onBlur={handleBlur}
      />
      <span>&rarr;</span>
      <DatePicker
        aria-label="Due date"
        className="tasks-add_field"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        onBlur={handleBlur}
      />
      <Select
        aria-label="Priority"
        value={priority}
        onChange={(e) => setPriority(e.target.value as TaskPriority)}
        onBlur={handleBlur}
        className="tasks-add_field tasks-add_field--select"
      >
        {TASK_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
      </Select>
      <Input
        type="number"
        min={0}
        step="0.25"
        aria-label="Estimate in hours"
        placeholder="Hours"
        value={estimate}
        onChange={(e) => setEstimate(e.target.value)}
        onBlur={handleBlur}
        className="tasks-add_field"
      />
      <Input
        type="number"
        min={0}
        step={1}
        aria-label="Story points"
        placeholder="Points"
        value={points}
        onChange={(e) => setPoints(e.target.value)}
        onBlur={handleBlur}
        className="tasks-add_field"
      />
      <Select
        aria-label="Repeat"
        value={recurrence}
        onChange={(e) => setRecurrence(e.target.value)}
        onBlur={handleBlur}
        className="tasks-add_field tasks-add_field--select"
      >
        {RECURRENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
      <Select
        aria-label="Type"
        value={kind}
        onChange={(e) => setKind(e.target.value as TaskKind)}
        onBlur={handleBlur}
        className="tasks-add_field tasks-add_field--select"
      >
        {TASK_KINDS.map(({ key, label }) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </Select>
      {epics.length > 0 && (
        <Select
          value={epicId}
          onChange={(e) => setEpicId(e.target.value)}
          onBlur={handleBlur}
          className="tasks-add_field tasks-add_field--select"
        >
          <option value="">No epic</option>
          {epics.map((epic) => (
            <option key={epic.id} value={epic.id}>{epic.title}</option>
          ))}
        </Select>
      )}
      {sprints.length > 0 && (
        <Select
          value={sprintId}
          onChange={(e) => setSprintId(e.target.value)}
          onBlur={handleBlur}
          className="tasks-add_field tasks-add_field--select"
        >
          <option value="">No sprint</option>
          {sprints.map((sprint) => (
            <option key={sprint.id} value={sprint.id}>{sprint.title}</option>
          ))}
        </Select>
      )}
      {members.length > 1 && (
        <>
          <PeoplePicker label="Assignees" members={members} value={assigneeIds} onChange={setAssigneeIds} />
          <PeoplePicker label="Watchers" members={members} value={watcherIds} onChange={setWatcherIds} />
        </>
      )}
      {milestones.length > 0 && (
        <Select
          aria-label="Milestone"
          value={milestoneId}
          onChange={(e) => setMilestoneId(e.target.value)}
          onBlur={handleBlur}
          className="tasks-add_field tasks-add_field--select"
        >
          <option value="">No milestone</option>
          {milestones.map((milestone) => (
            <option key={milestone.id} value={milestone.id}>{milestone.title}</option>
          ))}
        </Select>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TasksScreen() {
  const paths = usePaths()
  usePageTitle('Tasks')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view') === 'kanban' ? 'kanban' : 'backlog'

  const [filters, setFilters] = useState<TaskFilters>(() => {
    const epicId = searchParams.get('epic_id')
    const sprintId = searchParams.get('sprint_id')
    const folderId = searchParams.get('folder_id')
    return {
      ...(epicId ? { epic_id: Number(epicId) } : {}),
      ...(sprintId ? { sprint_id: Number(sprintId) } : {}),
      ...(folderId ? { folder_id: Number(folderId) } : {}),
    }
  })
  const [showFilters, setShowFilters] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const { data: workspace } = useWorkspace()
  // The board is the folder being filtered to, else the whole Space.
  const { statuses } = useBoardStatuses(filters.folder_id)
  const [showStatuses, setShowStatuses] = useState(false)
  const boardFolder = filters.folder_id ? flattenFolders(workspace?.folders ?? []).find((f) => f.id === filters.folder_id) : undefined
  const { data: epics = [] } = useEpics()
  const { data: sprints = [] } = useSprints()
  const { data: milestones = [] } = useMilestones()
  const epicById = new Map(epics.map((e) => [e.id, e]))
  const { data: members = [] } = useWorkspaceMembers(workspace?.id ?? 0)
  const memberByUserId = new Map(members.map((m) => [m.user_id, m]))
  const assigneesOf = (task: Task) =>
    (task.assignee_ids ?? []).flatMap((id) => memberByUserId.get(id) ?? [])

  useEffect(() => {
    const epicId = searchParams.get('epic_id')
    if (epicId) setFilters((f) => ({ ...f, epic_id: Number(epicId) }))
    const sprintId = searchParams.get('sprint_id')
    if (sprintId) setFilters((f) => ({ ...f, sprint_id: Number(sprintId) }))
    const folderId = searchParams.get('folder_id')
    if (folderId) setFilters((f) => ({ ...f, folder_id: Number(folderId) }))
  }, [searchParams])

  const activeFilters: TaskFilters = {
    ...(filters.folder_id ? { folder_id: filters.folder_id } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.epic_id ? { epic_id: filters.epic_id } : {}),
    ...(filters.sprint_id ? { sprint_id: filters.sprint_id } : {}),
    ...(filters.kind ? { kind: filters.kind } : {}),
    ...(filters.assignee_id ? { assignee_id: filters.assignee_id } : {}),
    ...(searchQ.trim() ? { q: searchQ.trim() } : {}),
  }

  // A saved view puts its filters and search text on the board.
  function applyView({ q, ...saved }: TaskBoardConfig) {
    setFilters(saved)
    setSearchQ(q ?? '')
  }

  const { data: tasks = NO_TASKS, isLoading } = useTasks(activeFilters)
  const progressByTask = useMemo(() => progressById(tasks), [tasks])
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const [addingTo, setAddingTo] = useState<string | null>(null)
  // Workboard layout: a swimlane per epic (plus No epic) instead of one board.
  // Off by default; /tasks?view=kanban&lanes=epic opens it on, and the checkbox
  // changes it for the visit.
  const [byEpic, setByEpic] = useState(() => searchParams.get('lanes') === 'epic')
  const knownEpicIds = useMemo(() => new Set(epics.map((e) => e.id)), [epics])
  // The lane a card sits in (null on the plain board) and the column it is in:
  // the status, or lane plus status in a swimlane.
  const laneOf = (task: Task) => (byEpic ? epicLaneKey(task.epic_id, knownEpicIds) : null)
  const cellOf = (task: Task) => boardCellId(task.status, laneOf(task))
  const { data: taskFields = [] } = useTaskFields()
  const [managingFields, setManagingFields] = useState(false)
  const [fieldsTaskId, setFieldsTaskId] = useState<number | null>(null)
  const fieldsTask = tasks.find((t) => t.id === fieldsTaskId) ?? null
  const [historyTask, setHistoryTask] = useState<Task | null>(null)
  const [filesTaskId, setFilesTaskId] = useState<number | null>(null)
  const filesTask = tasks.find((t) => t.id === filesTaskId) ?? null
  const [editing, setEditing] = useState<Task | null>(null)

  useEffect(() => {
    if (searchParams.get('new') === '1') setAddingTo('backlog')
  }, [searchParams])

  // Local task list for optimistic DnD reordering
  const localRef = useRef<Task[]>(tasks)
  const [localTasks, setLocalTasksState] = useState<Task[]>(tasks)
  const [activeId, setActiveId] = useState<number | null>(null)

  function setLocalTasks(updater: (prev: Task[]) => Task[]) {
    setLocalTasksState((prev) => {
      const next = updater(prev)
      localRef.current = next
      return next
    })
  }

  // Sync server → local when not dragging
  useEffect(() => {
    if (activeId === null) {
      localRef.current = tasks
      setLocalTasksState(tasks)
    }
  }, [tasks, activeId])

  const activeTask = activeId !== null ? localRef.current.find((t) => t.id === activeId) ?? null : null

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as number)
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const dragId = active.id as number
    const overId = over.id

    const current = localRef.current
    const dragTask = current.find((t) => t.id === dragId)
    if (!dragTask) return

    // Over a column, or over a card (then the column that card is in).
    const overTask = current.find((t) => t.id === overId)
    const target = parseBoardCell(overId) ?? (overTask ? { status: overTask.status, laneKey: laneOf(overTask) } : null)

    if (!target || (target.status === dragTask.status && target.laneKey === laneOf(dragTask))) return

    // Dropped into another swimlane, the card takes that lane's epic.
    setLocalTasks((prev) =>
      prev.map((t) => (t.id === dragId ? { ...t, status: target.status, ...(target.laneKey ? { epic_id: laneEpicId(target.laneKey) } : {}) } : t))
    )
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const dragId = active.id as number
    const current = localRef.current

    if (over && !parseBoardCell(over.id)) {
      const overId = over.id as number
      const dragTask = current.find((t) => t.id === dragId)
      const overTask = current.find((t) => t.id === overId)

      if (dragTask && overTask && cellOf(dragTask) === cellOf(overTask)) {
        const cell = cellOf(dragTask)
        const col = current.filter((t) => cellOf(t) === cell)
        const from = col.findIndex((t) => t.id === dragId)
        const to = col.findIndex((t) => t.id === overId)
        if (from !== -1 && to !== -1 && from !== to) {
          const reordered = arrayMove(col, from, to)
          setLocalTasks((prev) => [
            ...prev.filter((t) => cellOf(t) !== cell),
            ...reordered,
          ])
        }
      }
    }

    // Persist what a drop changed: the status, and in a swimlane the epic.
    const original = tasks.find((t) => t.id === dragId)
    const updated = localRef.current.find((t) => t.id === dragId)
    if (original && updated) {
      const changes: Partial<Task> = {}
      if (original.status !== updated.status) changes.status = updated.status
      if (byEpic && (original.epic_id ?? null) !== (updated.epic_id ?? null)) changes.epic_id = updated.epic_id ?? null
      if (Object.keys(changes).length > 0) updateTask.mutate({ id: dragId, ...changes })
    }

    setActiveId(null)
  }

  function onDragCancel() {
    setActiveId(null)
    localRef.current = tasks
    setLocalTasksState(tasks)
  }

  function createTaskWith(status: TaskStatus, fields: NewTaskFields) {
    const { estimateHours, storyPoints, ...rest } = fields
    createTask.mutate({ ...rest, estimate_hours: estimateHours, story_points: storyPoints, status, folder_id: filters.folder_id })
  }

  // One status column of the board, or of a swimlane. A lane's cards leave out
  // the epic line (the lane is the epic) and a task added there starts in it.
  function renderColumn(status: TaskStatus, lane?: EpicLane) {
    const id = boardCellId(status, lane?.key)
    const colTasks = localTasks.filter((t) => cellOf(t) === id)
    return (
      <KanbanColumn key={id} cellId={id} label={statuses[status].label} color={statuses[status].color} tasks={colTasks}>
        {colTasks.map((task) => (
          <SortableCard
            key={task.id}
            task={task}
            onNext={NEXT_STATUS[task.status] ? () => updateTask.mutate({ id: task.id, status: NEXT_STATUS[task.status]! }) : null}
            nextLabel={nextStatusLabel(statuses, task.status)}
            onNavigate={() => navigate(paths.document(task.document_id))}
            onEdit={() => setEditing(task)}
            epicTitle={!lane && task.epic_id ? epicById.get(task.epic_id)?.title : undefined}
            fields={taskFields}
            onEditFields={() => setFieldsTaskId(task.id)}
            progress={progressByTask.get(task.id)}
            assignees={assigneesOf(task)}
            onHistory={() => setHistoryTask(task)}
            onFiles={() => setFilesTaskId(task.id)}
          />
        ))}
        {addingTo === id ? (
          <div className="tasks-add_card">
            <AddTaskInput
              onAdd={(fields) => { createTaskWith(status, fields); setAddingTo(null) }}
              onCancel={() => setAddingTo(null)}
              epics={epics}
              sprints={sprints}
              milestones={milestones}
              members={members}
              defaultEpicId={lane?.epicId}
            />
          </div>
        ) : (
          <Button
            variant="muted"
            onClick={() => setAddingTo(id)}
            className="tasks-add_button"
          >
            <Plus className="tasks-icon" />
            Add task
          </Button>
        )}
      </KanbanColumn>
    )
  }

  const peopleNames = new Map(members.map((member) => [member.user_id, member.user.name] as const))

  return (
    <TaskFieldPeople.Provider value={peopleNames}>
    <WorkspaceLayout>
      <div className="view-tasks">
        <div className="tasks-header">
          <h1 className="tasks-title">Tasks</h1>
          <Tabs label="View">
            <Tab active={view === 'backlog'} onClick={() => navigate('/tasks?view=backlog')}>Backlog</Tab>
            <Tab active={view === 'kanban'} onClick={() => navigate('/tasks?view=kanban')}>Workboard</Tab>
          </Tabs>
          <div className="tasks-tools">
            {view === 'kanban' && (
              <label className="tasks-lanes_toggle" title="One swimlane per epic, plus a No epic lane">
                <Input type="checkbox" checked={byEpic} onChange={(e) => setByEpic(e.target.checked)} />
                Organize by epic
              </label>
            )}
            <div className="tasks-search">
              <Search className="tasks-search_icon" />
              <Input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search tasks…"
                className="tasks-search_input"
              />
            </div>
            {canWriteWorkspace(workspace?.role) && (
              <Button
                variant="muted"
                onClick={() => setShowStatuses(true)}
                className="tasks-filter_button"
                title="Rename and recolor the statuses"
              >
                <Palette className="tasks-icon" />
                Statuses
              </Button>
            )}
            <Button
              variant="muted"
              onClick={() => setManagingFields(true)}
              className="tasks-filter_button"
              title="Add or change the fields tasks carry, such as tags or a rating"
            >
              <SlidersHorizontal className="tasks-icon" />
              Fields
            </Button>
            <Button
              variant="muted"
              onClick={() => setShowFilters((o) => !o)}
              className={classNames('tasks-filter_button', !!(showFilters || filters.folder_id || filters.status || filters.epic_id || filters.sprint_id || filters.assignee_id || filters.kind) && 'tasks-filter_button--active')}
            >
              <Filter className="tasks-icon" />
              Filter
              {(filters.folder_id || filters.status || filters.epic_id || filters.sprint_id || filters.assignee_id || filters.kind) && <span className="tasks-filter_dot" />}
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="tasks-filters">
            <span className="tasks-filter_label">Folder</span>
            <Select
              className="tasks-filter_select"
              value={filters.folder_id ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, folder_id: e.target.value ? Number(e.target.value) : undefined }))}
            >
              <option value="">All folders</option>
              {workspace?.folders?.map((folder) => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </Select>
            <span className="tasks-filter_label">Status</span>
            <Select
              className="tasks-filter_select"
              value={filters.status ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
            >
              <option value="">Any status</option>
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>{statuses[status].label}</option>
              ))}
            </Select>
            <span className="tasks-filter_label">Type</span>
            <Select
              className="tasks-filter_select"
              value={filters.kind ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, kind: (e.target.value || undefined) as TaskKind | undefined }))}
            >
              <option value="">Any type</option>
              {TASK_KINDS.map(({ key, label }) => (
                <option key={key} value={key}>{key === 'bug' ? 'Bugs (queue)' : label}</option>
              ))}
            </Select>
            <span className="tasks-filter_label">Assignee</span>
            <Select
              className="tasks-filter_select"
              value={filters.assignee_id ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, assignee_id: e.target.value ? Number(e.target.value) : undefined }))}
            >
              <option value="">Anyone</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.user.name}</option>
              ))}
            </Select>
            <span className="tasks-filter_label">Epic</span>
            <Select
              className="tasks-filter_select"
              value={filters.epic_id ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, epic_id: e.target.value ? Number(e.target.value) : undefined }))}
            >
              <option value="">All epics</option>
              {epics.map((epic) => (
                <option key={epic.id} value={epic.id}>{epic.title}</option>
              ))}
            </Select>
            <span className="tasks-filter_label">Sprint</span>
            <Select
              className="tasks-filter_select"
              value={filters.sprint_id ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, sprint_id: e.target.value ? Number(e.target.value) : undefined }))}
            >
              <option value="">All sprints</option>
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>{sprint.title}</option>
              ))}
            </Select>
            {(filters.folder_id || filters.status || filters.epic_id || filters.sprint_id || filters.assignee_id || filters.kind) && (
              <Button
                variant="muted"
                onClick={() => setFilters({})}
                className="tasks-clear"
              >
                <X className="tasks-icon tasks-icon--sm" /> Clear
              </Button>
            )}
            <SavedViews page="tasks" config={activeFilters} parse={parseTaskBoardConfig} onApply={applyView} />
          </div>
        )}

        {view === 'kanban' && filters.sprint_id && sprints.find((sp) => sp.id === filters.sprint_id) && (
          <SprintHeader sprint={sprints.find((sp) => sp.id === filters.sprint_id) as Sprint} />
        )}

        {isLoading && (
          <div className="tasks-loading">
            <Loader2 className="tasks-spinner" />
          </div>
        )}

        {!isLoading && view === 'kanban' && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
          >
            {byEpic ? (
              <div className="tasks-board tasks-board--lanes">
                {epicLanes(tasks, epics).map((lane) => (
                  <section key={lane.key} className="tasks-lane" aria-label={lane.title}>
                    <h2 className="tasks-lane_title">
                      <span className="tasks-lane_name">{lane.title}</span>
                      <span className="tasks-count">{localTasks.filter((t) => laneOf(t) === lane.key).length}</span>
                    </h2>
                    <div className="tasks-columns">{BOARD_STATUSES.map((status) => renderColumn(status, lane))}</div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="tasks-board">
                <div className="tasks-columns">{BOARD_STATUSES.map((status) => renderColumn(status))}</div>
              </div>
            )}
            <DragOverlay>
              {activeTask && (
                <TaskCard
                  task={activeTask}
                  onNext={null}
                  onNavigate={() => {}}
                  fields={taskFields}
                  overlay
                />
              )}
            </DragOverlay>
          </DndContext>
        )}

        {!isLoading && view === 'backlog' && (
          <div className="tasks-backlog">
            <div className="tasks-backlog_inner">
              <div className="tasks-backlog_header">
                <div className="tasks-backlog_title">
                  <StatusDot color={statuses.backlog.color} />
                  <span className="tasks-column_label">{statuses.backlog.label}</span>
                  <span className="tasks-count">{tasks.filter((t) => t.status === 'backlog').length}</span>
                </div>
                <IconButton onClick={() => setAddingTo('backlog')} label="Add task">
                  <Plus className="tasks-icon tasks-icon--md" />
                </IconButton>
              </div>

              {addingTo === 'backlog' && (
                <div className="tasks-backlog_add">
                  <AddTaskInput
                    onAdd={(fields) => { createTaskWith('backlog', fields); setAddingTo(null) }}
                    onCancel={() => setAddingTo(null)}
                    epics={epics}
                    sprints={sprints}
                    milestones={milestones}
                    members={members}
                  />
                </div>
              )}

              <div className="tasks-list">
                {tasks.filter((t) => t.status === 'backlog').map((task) => (
                  <div key={task.id} className="tasks-row">
                    <p className="tasks-row_title">{task.title}</p>
                    {task.epic_id && epicById.get(task.epic_id) && (
                      <span className="tasks-epic tasks-epic--row">
                        <Target className="tasks-icon tasks-icon--sm" />
                        {epicById.get(task.epic_id)!.title}
                      </span>
                    )}
                    {task.document && (
                      <Button
                        onClick={() => navigate(paths.document(task.document_id))}
                        className="tasks-doc_link tasks-doc_link--row"
                      >
                        {task.document.title}
                      </Button>
                    )}
                    <div className="tasks-row_actions">
                      {taskFields.length > 0 && (
                        <IconButton
                          onClick={() => setFieldsTaskId(task.id)}
                          title="Edit fields"
                          label={`Edit fields of ${task.title}`}
                        >
                          <SlidersHorizontal className="tasks-icon" />
                        </IconButton>
                      )}
                      <IconButton onClick={() => setFilesTaskId(task.id)} title="Attached files" label={`Files of ${task.title}`} className="tasks-row_action--files">
                        <Paperclip className="tasks-icon" />
                        {!!task.file_ids?.length && <span className="tasks-meta">{task.file_ids.length}</span>}
                      </IconButton>
                      <IconButton onClick={() => setHistoryTask(task)} title="Status history" label={`Status history of ${task.title}`}>
                        <History className="tasks-icon" />
                      </IconButton>
                      <IconButton
                        onClick={() => updateTask.mutate({ id: task.id, status: 'todo' })}
                        title={`Move to ${statuses.todo.label}`}
                        label={`Move to ${statuses.todo.label}`}
                        className="tasks-row_action--start"
                      >
                        <Play className="tasks-icon" />
                      </IconButton>
                      <IconButton
                        tone="danger"
                        onClick={() => deleteTask.mutate(task.id)}
                        label="Delete task"
                        title="Delete task"
                      >
                        <X className="tasks-icon" />
                      </IconButton>
                    </div>
                    <TaskFieldChips fields={taskFields} task={task} />
                  </div>
                ))}
                {tasks.filter((t) => t.status === 'backlog').length === 0 && !addingTo && (
                  <p className="tasks-empty">No tasks in {statuses.backlog.label}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <TaskFieldsDialog task={fieldsTask} fields={taskFields} onClose={() => setFieldsTaskId(null)} />
        <ManageTaskFieldsDialog open={managingFields} fields={taskFields} onClose={() => setManagingFields(false)} />
        <StatusSettings
          open={showStatuses}
          folderId={filters.folder_id ?? null}
          boardName={boardFolder?.name ?? workspace?.name ?? 'this Space'}
          onClose={() => setShowStatuses(false)}
        />
      </div>
      <TaskHistoryDialog task={historyTask} onClose={() => setHistoryTask(null)} />
      {filesTask && <TaskFiles key={filesTask.id} task={filesTask} onClose={() => setFilesTaskId(null)} />}
      {editing && <TaskDetail key={editing.id} task={editing} onClose={() => setEditing(null)} />}
    </WorkspaceLayout>
    </TaskFieldPeople.Provider>
  )
}
