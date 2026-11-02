import type { Epic, Task } from '@/types'
import { donePercent } from '@/data/schedule'

// Pure logic behind the epic planning view (view/epic_plan): which tasks sit in
// an epic, how they group by status, what a drag changes, and the epic's rollup.

export type TaskStatus = Task['status']

// Statuses in the order work moves through them: the sections of the plan.
export const PLAN_STATUSES: { key: TaskStatus; label: string }[] = [
  { key: 'backlog', label: 'Backlog' },
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'in_review', label: 'In Review' },
  { key: 'done', label: 'Done' },
]

export const STATUS_LABEL = Object.fromEntries(PLAN_STATUSES.map((s) => [s.key, s.label])) as Record<TaskStatus, string>

// Drop target for tasks that belong to no epic (the backlog pane).
export const UNPLANNED = 'unplanned'
export type PlanTarget = TaskStatus | typeof UNPLANNED

export function isPlanTarget(id: unknown): id is PlanTarget {
  return id === UNPLANNED || PLAN_STATUSES.some((s) => s.key === id)
}

export function epicTasks(tasks: Task[], epicId: number): Task[] {
  return tasks.filter((t) => t.epic_id === epicId)
}

// What can be planned into an epic: top-level, unfinished tasks that no epic has
// yet (a subtask travels with its parent). Unstarted backlog items come first;
// `query` narrows by title.
export function unplannedTasks(tasks: Task[], query = ''): Task[] {
  const needle = query.trim().toLowerCase()
  const rank = (t: Task) => PLAN_STATUSES.findIndex((s) => s.key === t.status)
  return tasks
    .filter((t) => t.epic_id == null && t.parent_id == null && t.status !== 'done')
    .filter((t) => !needle || t.title.toLowerCase().includes(needle))
    .map((t, index) => ({ t, index }))
    .sort((a, b) => rank(a.t) - rank(b.t) || a.index - b.index)
    .map(({ t }) => t)
}

export function groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups: Record<TaskStatus, Task[]> = { backlog: [], todo: [], in_progress: [], in_review: [], done: [] }
  tasks.forEach((t) => groups[t.status].push(t))
  return groups
}

export type PlanChanges = Partial<Pick<Task, 'status' | 'epic_id'>>

// The update a drop makes, or null when nothing changes. Dropping on a status
// section sets that status, and first puts a task that has no epic into this
// one; dropping on the backlog pane takes a task out of the epic. Moving a task
// between epics is the Hierarchy page's job, so a task of another epic is
// left alone.
export function planMove(task: Task, epicId: number, target: PlanTarget): PlanChanges | null {
  if (target === UNPLANNED) return task.epic_id === epicId ? { epic_id: null } : null
  if (task.epic_id === epicId) return task.status === target ? null : { status: target }
  if (task.epic_id != null) return null
  return task.status === target ? { epic_id: epicId } : { epic_id: epicId, status: target }
}

// Server tasks with edits that are still being saved laid over them, so a drag
// or a date change shows at once instead of after the refetch.
export type TaskPatches = Record<number, Partial<Task>>

export function patchTasks(tasks: Task[], patches: TaskPatches): Task[] {
  return tasks.map((t) => (patches[t.id] ? { ...t, ...patches[t.id] } : t))
}

export function addPatch(patches: TaskPatches, id: number, changes: Partial<Task>): TaskPatches {
  return { ...patches, [id]: { ...patches[id], ...changes } }
}

// Drops the fields of a finished save from the patch, unless a newer edit has
// replaced them meanwhile.
export function settlePatch(patches: TaskPatches, id: number, changes: Partial<Task>): TaskPatches {
  const current = patches[id]
  if (!current) return patches
  const remaining = Object.fromEntries(
    Object.entries(current).filter(([key, value]) => !(key in changes && value === changes[key as keyof Task])),
  )
  const next = { ...patches }
  if (Object.keys(remaining).length === 0) delete next[id]
  else next[id] = remaining
  return next
}

export interface EpicPlan {
  total: number
  done: number
  percent: number
  byStatus: Record<TaskStatus, number>
  // Tasks with a start or due date, and tasks without either.
  scheduled: number
  unscheduled: number
  // Unfinished tasks whose due date is before today.
  overdue: number
  // Earliest and latest task date (start or due), or null when nothing is dated.
  firstDate: string | null
  lastDate: string | null
  // The tasks' dates reach outside the epic's own start/target dates.
  startsBeforeEpic: boolean
  endsAfterEpic: boolean
}

// The epic's rollup, computed from its tasks. `today` is a yyyy-MM-dd date;
// ISO dates compare correctly as strings.
export function epicPlan(epic: Pick<Epic, 'start_date' | 'target_date'>, tasks: Task[], today: string): EpicPlan {
  const byStatus = Object.fromEntries(Object.entries(groupByStatus(tasks)).map(([k, v]) => [k, v.length])) as Record<TaskStatus, number>
  const dates = tasks.flatMap((t) => [t.start_date, t.due_date]).filter((d): d is string => !!d).sort()
  const scheduled = tasks.filter((t) => t.start_date || t.due_date).length
  const firstDate = dates[0] ?? null
  const lastDate = dates[dates.length - 1] ?? null
  return {
    total: tasks.length,
    done: byStatus.done,
    percent: donePercent({ tasks_count: tasks.length, done_tasks_count: byStatus.done }),
    byStatus,
    scheduled,
    unscheduled: tasks.length - scheduled,
    overdue: tasks.filter((t) => t.status !== 'done' && !!t.due_date && t.due_date < today).length,
    firstDate,
    lastDate,
    startsBeforeEpic: !!firstDate && !!epic.start_date && firstDate < epic.start_date,
    endsAfterEpic: !!lastDate && !!epic.target_date && lastDate > epic.target_date,
  }
}
