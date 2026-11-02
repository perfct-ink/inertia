import { Button, Input, Select, StatusDot, classNames, DatePicker } from '@/components/ui'
import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, X, ArrowRight, Play, Loader2, Search, Filter, Target, SlidersHorizontal, Palette } from 'lucide-react'
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
  type UniqueIdentifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { CommentsButton } from '@/components/comments/CommentsButton'
import SprintHeader from '@/components/SprintHeader'
import { TASK_PRIORITIES, estimateLabel, pointsLabel, priorityLabel } from '@/data/task'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, type TaskFilters } from '@/api/tasks'
import { useWorkspace } from '@/api/workspace'
import { canWriteWorkspace } from '@/api/workspaces'
import { useEpics } from '@/api/epics'
import { useSprints } from '@/api/sprints'
import { useMilestones } from '@/api/milestones'
import { useTaskFields } from '@/api/taskFields'
import { TaskFieldChips } from '@/components/task-fields/TaskFieldChips'
import { TaskFieldsDialog } from '@/components/task-fields/TaskFieldsDialog'
import { ManageTaskFieldsDialog } from '@/components/task-fields/ManageTaskFieldsDialog'
import type { Task, TaskField, Epic, Sprint, Milestone, TaskStatus, TaskStatusColor, TaskPriority } from '@/types'
import './TasksScreen.scss'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useBoardStatuses } from '@/hooks/useBoardStatuses'
import { StatusSettings } from '@/components/workspace/StatusSettings'
import { BOARD_STATUSES, NEXT_STATUS, TASK_STATUSES, nextStatusLabel } from '@/data/task_status'
import { flattenFolders } from '@/data/folder'

function isColumnId(id: UniqueIdentifier): id is TaskStatus {
  return BOARD_STATUSES.includes(id as TaskStatus)
}

// ── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  task: Task
  onDelete?: () => void
  onNext: (() => void) | null
  // Name of the status onNext moves the task to.
  nextLabel?: string | null
  onNavigate: () => void
  epicTitle?: string
  overlay?: boolean
  // The Space's custom task fields, shown as chips; the edit button opens them.
  fields?: TaskField[]
  onEditFields?: () => void
}

function TaskCard({ task, onNext, nextLabel, onNavigate, epicTitle, overlay, fields = [], onEditFields }: Omit<CardProps, 'onDelete'>) {
  return (
    <div className={classNames('tasks-card', overlay && 'tasks-card--overlay')}>
      <div className="tasks-card_title_row">
        <p className="tasks-card_title">{task.title}</p>
      </div>
      {epicTitle && (
        <div className="tasks-epic tasks-epic--card">
          <Target className="tasks-icon tasks-icon--sm" />
          <span className="tasks-epic_title">{epicTitle}</span>
        </div>
      )}
      <TaskFieldChips fields={fields} task={task} />
      <div className="tasks-card_footer">
        {priorityLabel(task.priority) && <span className={`tasks-priority tasks-priority--${task.priority}`}>{priorityLabel(task.priority)}</span>}
        {pointsLabel(task) && <span className="tasks-meta">{pointsLabel(task)}</span>}
        {estimateLabel(task.estimate_hours) && <span className="tasks-meta">{estimateLabel(task.estimate_hours)}</span>}
        {task.document && (
          <Button
            onClick={onNavigate}
            className="tasks-doc_link"
          >
            {task.document.title}
          </Button>
        )}
        <div className="tasks-card_actions">
          {!overlay && <CommentsButton type="Task" id={task.id} title={task.title} />}
          {onEditFields && fields.length > 0 && !overlay && (
            <Button
              onClick={onEditFields}
              className="tasks-card_fields"
              title="Edit fields"
              aria-label={`Edit fields of ${task.title}`}
            >
              <SlidersHorizontal className="tasks-icon" />
            </Button>
          )}
          {onNext && !overlay && (
            <Button
              onClick={onNext}
              className="tasks-next"
              title={`Move to ${nextLabel}`}
              aria-label={`Move to ${nextLabel}`}
            >
              <ArrowRight className="tasks-icon" />
            </Button>
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

function KanbanColumn({ status, label, color, tasks, children }: {
  status: TaskStatus
  label: string
  color: TaskStatusColor
  tasks: Task[]
  children: React.ReactNode
}) {
  const { setNodeRef } = useDroppable({ id: status })
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
}

interface AddTaskInputProps {
  onAdd: (fields: NewTaskFields) => void
  onCancel: () => void
  epics: Epic[]
  sprints: Sprint[]
  milestones: Milestone[]
}

function AddTaskInput({ onAdd, onCancel, epics, sprints, milestones }: AddTaskInputProps) {
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [epicId, setEpicId] = useState('')
  const [sprintId, setSprintId] = useState('')
  const [milestoneId, setMilestoneId] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('none')
  const [estimate, setEstimate] = useState('')
  const [points, setPoints] = useState('')
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
    ...(searchQ.trim() ? { q: searchQ.trim() } : {}),
  }

  const { data: tasks = [], isLoading } = useTasks(activeFilters)
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()

  const [addingTo, setAddingTo] = useState<TaskStatus | null>(null)
  const { data: taskFields = [] } = useTaskFields()
  const [managingFields, setManagingFields] = useState(false)
  const [fieldsTaskId, setFieldsTaskId] = useState<number | null>(null)
  const fieldsTask = tasks.find((t) => t.id === fieldsTaskId) ?? null

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

    const targetStatus = isColumnId(overId)
      ? overId
      : current.find((t) => t.id === (overId as number))?.status

    if (!targetStatus || targetStatus === dragTask.status) return

    setLocalTasks((prev) =>
      prev.map((t) => (t.id === dragId ? { ...t, status: targetStatus } : t))
    )
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const dragId = active.id as number
    const current = localRef.current

    if (over && !isColumnId(over.id)) {
      const overId = over.id as number
      const dragTask = current.find((t) => t.id === dragId)
      const overTask = current.find((t) => t.id === overId)

      if (dragTask && overTask && dragTask.status === overTask.status) {
        const col = current.filter((t) => t.status === dragTask.status)
        const from = col.findIndex((t) => t.id === dragId)
        const to = col.findIndex((t) => t.id === overId)
        if (from !== -1 && to !== -1 && from !== to) {
          const reordered = arrayMove(col, from, to)
          setLocalTasks((prev) => [
            ...prev.filter((t) => t.status !== dragTask.status),
            ...reordered,
          ])
        }
      }
    }

    // Persist status change if it moved columns
    const original = tasks.find((t) => t.id === dragId)
    const updated = localRef.current.find((t) => t.id === dragId)
    if (original && updated && original.status !== updated.status) {
      updateTask.mutate({ id: dragId, status: updated.status })
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

  return (
    <WorkspaceLayout>
      <div className="view-tasks">
        <div className="tasks-header">
          <h1 className="tasks-title">Tasks</h1>
          <div className="tasks-tabs">
            <Button
              onClick={() => navigate('/tasks?view=backlog')}
              className={classNames('tasks-tab', view === 'backlog' && 'tasks-tab--active')}
            >
              Backlog
            </Button>
            <Button
              onClick={() => navigate('/tasks?view=kanban')}
              className={classNames('tasks-tab', view === 'kanban' && 'tasks-tab--active')}
            >
              Workboard
            </Button>
          </div>
          <div className="tasks-tools">
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
                onClick={() => setShowStatuses(true)}
                className="tasks-filter_button"
                title="Rename and recolor the statuses"
              >
                <Palette className="tasks-icon" />
                Statuses
              </Button>
            )}
            <Button
              onClick={() => setManagingFields(true)}
              className="tasks-filter_button"
              title="Add or change the fields tasks carry, such as tags or a rating"
            >
              <SlidersHorizontal className="tasks-icon" />
              Fields
            </Button>
            <Button
              onClick={() => setShowFilters((o) => !o)}
              className={classNames('tasks-filter_button', !!(showFilters || filters.folder_id || filters.status || filters.epic_id || filters.sprint_id) && 'tasks-filter_button--active')}
            >
              <Filter className="tasks-icon" />
              Filter
              {(filters.folder_id || filters.status || filters.epic_id || filters.sprint_id) && <span className="tasks-filter_dot" />}
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
            {(filters.folder_id || filters.status || filters.epic_id || filters.sprint_id) && (
              <Button
                onClick={() => setFilters({})}
                className="tasks-clear"
              >
                <X className="tasks-icon tasks-icon--sm" /> Clear
              </Button>
            )}
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
            <div className="tasks-board">
              <div className="tasks-columns">
                {BOARD_STATUSES.map((key) => {
                  const colTasks = localTasks.filter((t) => t.status === key)
                  return (
                    <KanbanColumn key={key} status={key} label={statuses[key].label} color={statuses[key].color} tasks={colTasks}>
                      {colTasks.map((task) => (
                        <SortableCard
                          key={task.id}
                          task={task}
                          onNext={NEXT_STATUS[task.status] ? () => updateTask.mutate({ id: task.id, status: NEXT_STATUS[task.status]! }) : null}
                          nextLabel={nextStatusLabel(statuses, task.status)}
                          onNavigate={() => navigate(`/documents/${task.document_id}`)}
                          epicTitle={task.epic_id ? epicById.get(task.epic_id)?.title : undefined}
                          fields={taskFields}
                          onEditFields={() => setFieldsTaskId(task.id)}
                        />
                      ))}
                      {addingTo === key ? (
                        <div className="tasks-add_card">
                          <AddTaskInput
                            onAdd={(fields) => { createTaskWith(key, fields); setAddingTo(null) }}
                            onCancel={() => setAddingTo(null)}
                            epics={epics}
                            sprints={sprints}
                            milestones={milestones}
                          />
                        </div>
                      ) : (
                        <Button
                          onClick={() => setAddingTo(key)}
                          className="tasks-add_button"
                        >
                          <Plus className="tasks-icon" />
                          Add task
                        </Button>
                      )}
                    </KanbanColumn>
                  )
                })}
              </div>
            </div>

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
                <Button
                  onClick={() => setAddingTo('backlog')}
                  className="tasks-add_icon_button"
                  aria-label="Add task"
                >
                  <Plus className="tasks-icon tasks-icon--md" />
                </Button>
              </div>

              {addingTo === 'backlog' && (
                <div className="tasks-backlog_add">
                  <AddTaskInput
                    onAdd={(fields) => { createTaskWith('backlog', fields); setAddingTo(null) }}
                    onCancel={() => setAddingTo(null)}
                    epics={epics}
                    sprints={sprints}
                    milestones={milestones}
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
                        onClick={() => navigate(`/documents/${task.document_id}`)}
                        className="tasks-doc_link tasks-doc_link--row"
                      >
                        {task.document.title}
                      </Button>
                    )}
                    <div className="tasks-row_actions">
                      <CommentsButton type="Task" id={task.id} title={task.title} />
                      {taskFields.length > 0 && (
                        <Button
                          onClick={() => setFieldsTaskId(task.id)}
                          title="Edit fields"
                          aria-label={`Edit fields of ${task.title}`}
                          className="tasks-row_action tasks-row_action--fields"
                        >
                          <SlidersHorizontal className="tasks-icon" />
                        </Button>
                      )}
                      <Button
                        onClick={() => updateTask.mutate({ id: task.id, status: 'todo' })}
                        title={`Move to ${statuses.todo.label}`}
                        aria-label={`Move to ${statuses.todo.label}`}
                        className="tasks-row_action tasks-row_action--start"
                      >
                        <Play className="tasks-icon" />
                      </Button>
                      <Button
                        onClick={() => deleteTask.mutate(task.id)}
                        className="tasks-row_action tasks-row_action--delete"
                        aria-label="Delete task"
                        title="Delete task"
                      >
                        <X className="tasks-icon" />
                      </Button>
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
    </WorkspaceLayout>
  )
}
