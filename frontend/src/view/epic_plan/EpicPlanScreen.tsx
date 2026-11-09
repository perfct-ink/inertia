import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { format, parseISO } from 'date-fns'
import { GripVertical, ListChecks, Loader2, Plus, Target, X } from 'lucide-react'
import { Button, DatePicker, Input, Select, classNames } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { ProgressBar } from '@/components/Timeline'
import { useEpics, useUpdateEpic } from '@/api/epics'
import { useInitiatives } from '@/api/initiatives'
import { useMilestones } from '@/api/milestones'
import { useTasks, useUpdateTask } from '@/api/tasks'
import {
  PLAN_STATUSES, STATUS_LABEL, UNPLANNED, addPatch, epicPlan, epicTasks, groupByStatus, isPlanTarget, patchTasks, planMove,
  settlePatch, unplannedTasks, type EpicPlan, type PlanTarget, type TaskPatches, type TaskStatus,
} from '@/data/epic'
import { usePageTitle } from '@/hooks/usePageTitle'
import { todayISO } from '@/util/date'
import type { Epic, Task } from '@/types'
import '../planning/PlanningScreen.scss'
import './EpicPlanScreen.scss'

const longDate = (date: string) => format(parseISO(date), 'MMM d, yyyy')

export default function EpicPlanScreen() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const epicId = Number(searchParams.get('epic_id')) || null
  const { data: epics = [], isLoading: loadingEpics } = useEpics()
  const { data: tasks = [], isLoading: loadingTasks } = useTasks()
  const epic = epics.find((e) => e.id === epicId) ?? null
  const isLoading = loadingEpics || loadingTasks
  usePageTitle(epic ? `Plan ${epic.title}` : 'Plan')

  return (
    <WorkspaceLayout>
      <div className="view-planning view-epic_plan">
        <div className="planning-header">
          <h1 className="planning-title">Plan</h1>
          {epics.length > 0 && (
            <Select
              aria-label="Epic to plan"
              value={epic?.id ?? ''}
              onChange={(e) => setSearchParams(e.target.value ? { epic_id: e.target.value } : {})}
              className="epic_plan-picker"
            >
              <option value="">Choose an epic…</option>
              {epics.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </Select>
          )}
        </div>

        <div className="planning-body">
          {isLoading && (
            <div className="planning-loading">
              <Loader2 className="planning-spinner" aria-label="Loading" />
            </div>
          )}

          {!isLoading && epics.length === 0 && (
            <div className="planning-empty">
              <Target className="planning-empty_icon" aria-hidden="true" />
              <p>Create an epic first, then plan its tasks here.</p>
              <Button variant="primary" onClick={() => navigate('/epics')}>Go to epics</Button>
            </div>
          )}

          {!isLoading && epics.length > 0 && !epic && (
            <div className="planning-empty">
              <ListChecks className="planning-empty_icon" aria-hidden="true" />
              <p>{epicId ? 'That epic is not in this Space.' : 'Choose an epic to plan its tasks.'}</p>
            </div>
          )}

          {!isLoading && epic && <EpicPlanner key={epic.id} epic={epic} tasks={tasks} />}
        </div>
      </div>
    </WorkspaceLayout>
  )
}

function EpicPlanner({ epic, tasks }: { epic: Epic; tasks: Task[] }) {
  const qc = useQueryClient()
  const updateTask = useUpdateTask()
  const { data: initiatives = [] } = useInitiatives()
  const { data: milestones = [] } = useMilestones()
  const [patches, setPatches] = useState<TaskPatches>({})
  const [query, setQuery] = useState('')
  const [activeId, setActiveId] = useState<number | null>(null)
  const today = useMemo(() => todayISO(), [])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  const allTasks = useMemo(() => patchTasks(tasks, patches), [tasks, patches])
  const inEpic = useMemo(() => epicTasks(allTasks, epic.id), [allTasks, epic.id])
  const groups = useMemo(() => groupByStatus(inEpic), [inEpic])
  const plan = useMemo(() => epicPlan(epic, inEpic, today), [epic, inEpic, today])
  const hasUnplanned = useMemo(() => unplannedTasks(allTasks).length > 0, [allTasks])
  const unplanned = useMemo(() => unplannedTasks(allTasks, query), [allTasks, query])
  const activeTask = activeId == null ? null : allTasks.find((t) => t.id === activeId) ?? null

  // Shows the edit at once and settles it once the server has answered. A failed
  // save has already shown its error (lib/api.ts), and the task falls back to
  // what the server holds.
  function save(task: Task, changes: Partial<Task>) {
    setPatches((p) => addPatch(p, task.id, changes))
    updateTask.mutateAsync({ id: task.id, ...changes })
      .catch(() => undefined)
      .finally(() => {
        setPatches((p) => settlePatch(p, task.id, changes))
        // The epic, its initiative and its milestone roll up from these tasks.
        for (const key of ['epics', 'initiatives', 'milestones']) qc.invalidateQueries({ queryKey: [key] })
      })
  }

  function move(task: Task, target: PlanTarget) {
    const changes = planMove(task, epic.id, target)
    if (changes) save(task, changes)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    const task = allTasks.find((t) => t.id === active.id)
    if (task && over && isPlanTarget(over.id)) move(task, over.id)
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={({ active }: DragStartEvent) => setActiveId(active.id as number)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="epic_plan-layout">
        <div className="epic_plan-main">
          <PlanSummary
            epic={epic}
            plan={plan}
            initiative={initiatives.find((i) => i.id === epic.initiative_id)?.title}
            milestone={milestones.find((m) => m.id === epic.milestone_id)?.title}
          />
          {plan.total === 0 && <p className="epic_plan-hint">No tasks in this epic yet. Drag one in from the backlog, or press Add.</p>}
          {PLAN_STATUSES.map(({ key, label }) => (
            <StatusSection key={key} status={key} label={label} count={groups[key].length}>
              {groups[key].map((task) => (
                <PlanTask key={task.id} task={task}>
                  <Select
                    aria-label={`Status of ${task.title}`}
                    value={task.status}
                    onChange={(e) => move(task, e.target.value as TaskStatus)}
                    className="epic_plan-status"
                  >
                    {PLAN_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </Select>
                  <DatePicker
                    aria-label={`Start date of ${task.title}`}
                    value={task.start_date ?? ''}
                    max={task.due_date ?? undefined}
                    onChange={(e) => save(task, { start_date: e.target.value || null })}
                    className="epic_plan-date"
                  />
                  <span className="epic_plan-arrow" aria-hidden="true">&rarr;</span>
                  <DatePicker
                    aria-label={`Due date of ${task.title}`}
                    value={task.due_date ?? ''}
                    min={task.start_date ?? undefined}
                    onChange={(e) => save(task, { due_date: e.target.value || null })}
                    className="epic_plan-date"
                  />
                  <Button
                    onClick={() => move(task, UNPLANNED)}
                    aria-label={`Remove ${task.title} from the epic`}
                    title="Remove from the epic"
                    className="epic_plan-icon_button epic_plan-remove"
                  >
                    <X aria-hidden="true" />
                  </Button>
                </PlanTask>
              ))}
            </StatusSection>
          ))}
        </div>

        <BacklogPane showSearch={hasUnplanned} query={query} onQuery={setQuery} count={unplanned.length}>
          {unplanned.map((task) => (
            <PlanTask key={task.id} task={task}>
              <span className="epic_plan-task_status">{STATUS_LABEL[task.status]}</span>
              <Button
                onClick={() => move(task, task.status)}
                aria-label={`Add ${task.title} to the epic`}
                title="Add to the epic"
                className="epic_plan-icon_button epic_plan-add"
              >
                <Plus aria-hidden="true" />
              </Button>
            </PlanTask>
          ))}
        </BacklogPane>
      </div>

      <DragOverlay>
        {activeTask && <div className="epic_plan-overlay">{activeTask.title}</div>}
      </DragOverlay>
    </DndContext>
  )
}

function PlanSummary({ epic, plan, initiative, milestone }: { epic: Epic; plan: EpicPlan; initiative?: string; milestone?: string }) {
  const updateEpic = useUpdateEpic()
  const parents = [initiative && `Initiative: ${initiative}`, milestone && `Milestone: ${milestone}`].filter(Boolean)
  return (
    <section className="epic_plan-summary" aria-label={`${epic.title} rollup`}>
      <div className="epic_plan-summary_top">
        <Target className="epic_plan-summary_icon" aria-hidden="true" />
        <h2 className="epic_plan-summary_title">{epic.title}</h2>
      </div>
      {parents.length > 0 && <p className="epic_plan-meta">{parents.join(' · ')}</p>}

      {plan.total > 0 && (
        <div className="epic_plan-progress">
          <ProgressBar percent={plan.percent} />
          <span className="epic_plan-meta">{plan.done}/{plan.total} done ({plan.percent}%)</span>
        </div>
      )}
      {plan.total > 0 && (
        <p className="epic_plan-meta">
          {plan.scheduled}/{plan.total} tasks dated
          {plan.firstDate && plan.lastDate && ` · ${longDate(plan.firstDate)} to ${longDate(plan.lastDate)}`}
          {plan.overdue > 0 && ` · ${plan.overdue} overdue`}
        </p>
      )}

      <div className="epic_plan-epic_dates">
        <label className="epic_plan-field">
          <span className="epic_plan-meta">Epic starts</span>
          <DatePicker
            value={epic.start_date ?? ''}
            max={epic.target_date ?? undefined}
            onChange={(e) => updateEpic.mutate({ id: epic.id, start_date: e.target.value || null })}
            className="epic_plan-date"
          />
        </label>
        <label className="epic_plan-field">
          <span className="epic_plan-meta">Epic target</span>
          <DatePicker
            value={epic.target_date ?? ''}
            min={epic.start_date ?? undefined}
            onChange={(e) => updateEpic.mutate({ id: epic.id, target_date: e.target.value || null })}
            className="epic_plan-date"
          />
        </label>
      </div>

      {plan.startsBeforeEpic && <p role="status" className="epic_plan-warning">Some tasks start before the epic does.</p>}
      {plan.endsAfterEpic && <p role="status" className="epic_plan-warning">Some tasks end after the epic&rsquo;s target date.</p>}
    </section>
  )
}

function StatusSection({ status, label, count, children }: { status: TaskStatus; label: string; count: number; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const headingId = `epic_plan-section-${status}`
  return (
    <section ref={setNodeRef} aria-labelledby={headingId} className={classNames('epic_plan-section', isOver && 'epic_plan-section--over')}>
      <h3 id={headingId} className="epic_plan-section_title">
        {label}
        <span className="epic_plan-count">{count}</span>
      </h3>
      {count > 0 && <ul className="epic_plan-list">{children}</ul>}
    </section>
  )
}

function BacklogPane({ showSearch, query, onQuery, count, children }: {
  showSearch: boolean
  query: string
  onQuery: (query: string) => void
  count: number
  children: ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: UNPLANNED })
  return (
    <aside ref={setNodeRef} aria-labelledby="epic_plan-backlog" className={classNames('epic_plan-backlog', isOver && 'epic_plan-backlog--over')}>
      <h2 id="epic_plan-backlog" className="epic_plan-section_title">
        Backlog
        <span className="epic_plan-count">{count}</span>
      </h2>
      <p className="epic_plan-meta">Tasks that are in no epic. Drag one into a status, or press Add.</p>
      {showSearch && (
        <Input
          type="search"
          aria-label="Search the backlog"
          placeholder="Search the backlog…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          className="epic_plan-search"
        />
      )}
      {count > 0
        ? <ul className="epic_plan-list">{children}</ul>
        : <p className="epic_plan-meta">{query.trim() ? 'No tasks match.' : 'Nothing left to plan.'}</p>}
    </aside>
  )
}

function PlanTask({ task, children }: { task: Task; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })
  return (
    <li ref={setNodeRef} className={classNames('epic_plan-task', isDragging && 'epic_plan-task--dragging')}>
      <Button {...attributes} {...listeners} aria-label={`Drag ${task.title}`} className="epic_plan-handle">
        <GripVertical aria-hidden="true" />
      </Button>
      <span className="epic_plan-task_title">{task.title}</span>
      {children}
    </li>
  )
}
