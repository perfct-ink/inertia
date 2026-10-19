import { Button, Input, Select, classNames } from '@/components/ui'
import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, X, ArrowRight, Play, Loader2, Search, Filter, Target } from 'lucide-react'
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
import { NEXT_STATUS, STATUS_LABEL, tasksWithStatus } from '@/data/task'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, type TaskFilters } from '@/api/tasks'
import { useWorkspace } from '@/api/workspace'
import { useEpics } from '@/api/epics'
import { useSprints } from '@/api/sprints'
import { useMilestones } from '@/api/milestones'
import type { Task, Epic, Sprint, Milestone } from '@/types'
import './TasksScreen.scss'
import { usePageTitle } from '@/hooks/usePageTitle'

const KANBAN_STATUSES: { key: Task['status']; label: string; dot: string }[] = [
  { key: 'todo', label: 'To Do', dot: '' },
  { key: 'in_progress', label: 'In Progress', dot: 'blue' },
  { key: 'in_review', label: 'In Review', dot: 'yellow' },
  { key: 'done', label: 'Done', dot: 'green' },
]

const KANBAN_KEYS = KANBAN_STATUSES.map((s) => s.key)

function isColumnId(id: UniqueIdentifier): id is Task['status'] {
  return KANBAN_KEYS.includes(id as Task['status'])
}

// ── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  task: Task
  onDelete?: () => void
  onNext: (() => void) | null
  onNavigate: () => void
  epicTitle?: string
  overlay?: boolean
}

function TaskCard({ task, onNext, onNavigate, epicTitle, overlay }: Omit<CardProps, 'onDelete'>) {
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
      <div className="tasks-card_footer">
        {task.document && (
          <Button
            onClick={onNavigate}
            className="tasks-doc_link"
          >
            {task.document.title}
          </Button>
        )}
        {onNext && !overlay && (
          <Button
            onClick={onNext}
            className="tasks-next"
            title={`Move to ${STATUS_LABEL[NEXT_STATUS[task.status]!]}`}
          >
            <ArrowRight className="tasks-icon" />
          </Button>
        )}
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

function KanbanColumn({ status, label, dot, tasks, children }: {
  status: Task['status']
  label: string
  dot: string
  tasks: Task[]
  children: React.ReactNode
}) {
  const { setNodeRef } = useDroppable({ id: status })
  return (
    <div className="tasks-column">
      <div className="tasks-column_header">
        <span className={classNames('tasks-dot', dot && `tasks-dot--${dot}`)} />
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
      <Input
        type="date"
        aria-label="Start date"
        className="tasks-add_field"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        onBlur={handleBlur}
      />
      <span>&rarr;</span>
      <Input
        type="date"
        aria-label="Due date"
        className="tasks-add_field"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        onBlur={handleBlur}
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

  const [addingTo, setAddingTo] = useState<Task['status'] | null>(null)

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

  function createTaskWith(status: Task['status'], fields: NewTaskFields) {
    createTask.mutate({ ...fields, status, folder_id: filters.folder_id })
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
              <option value="backlog">Backlog</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
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
                {KANBAN_STATUSES.map(({ key, label, dot }) => {
                  const colTasks = tasksWithStatus(localTasks, key)
                  return (
                    <KanbanColumn key={key} status={key} label={label} dot={dot} tasks={colTasks}>
                      {colTasks.map((task) => (
                        <SortableCard
                          key={task.id}
                          task={task}
                          onNext={NEXT_STATUS[task.status] ? () => updateTask.mutate({ id: task.id, status: NEXT_STATUS[task.status]! }) : null}
                          onNavigate={() => navigate(`/documents/${task.document_id}`)}
                          epicTitle={task.epic_id ? epicById.get(task.epic_id)?.title : undefined}
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
                  <span className="tasks-dot" />
                  <span className="tasks-column_label">Backlog</span>
                  <span className="tasks-count">{tasksWithStatus(tasks, 'backlog').length}</span>
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
                {tasksWithStatus(tasks, 'backlog').map((task) => (
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
                      <Button
                        onClick={() => updateTask.mutate({ id: task.id, status: 'todo' })}
                        title="Move to To Do"
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
                  </div>
                ))}
                {tasksWithStatus(tasks, 'backlog').length === 0 && !addingTo && (
                  <p className="tasks-empty">No backlog items</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </WorkspaceLayout>
  )
}
