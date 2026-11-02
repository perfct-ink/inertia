import type { Task, TaskPriority, TaskStatus } from '@/types'
import { donePercent } from '@/data/schedule'

// The task statuses the API accepts, in board order (mirrors Task.statuses in the backend).
export const TASK_STATUSES: Task['status'][] = ['backlog', 'todo', 'in_progress', 'in_review', 'done']

export const STATUS_LABEL: Record<Task['status'], string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
}

export interface TaskNode extends Task { children: TaskNode[] }

// The folder a task sits in: its own, else the one its document is in. That
// folder's board decides how the task's status is named and colored.
export function taskFolderId(task: Pick<Task, 'folder_id' | 'document'>): number | null {
  return task.folder_id ?? task.document?.folder_id ?? null
}

// Nests tasks under their parent task to any depth. A task whose parent is
// not in the list (e.g. filtered out) becomes a root.
export function buildTaskTree(tasks: Task[]): TaskNode[] {
  const byId = new Map<number, TaskNode>(tasks.map((t) => [t.id, { ...t, children: [] }]))
  const roots: TaskNode[] = []
  byId.forEach((node) => {
    const parent = node.parent_id != null ? byId.get(node.parent_id) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  })
  return roots
}

export type DueBucket = 'overdue' | 'today' | 'this_week' | 'later' | 'no_date'

export const DUE_BUCKET_LABEL: Record<DueBucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  this_week: 'This week',
  later: 'Later',
  no_date: 'No date',
}

const DUE_BUCKETS: DueBucket[] = ['overdue', 'today', 'this_week', 'later', 'no_date']

// Which bucket a due date (yyyy-MM-dd) falls in relative to `today`; "this week"
// is the next six days after today.
export function dueBucket(dueDate: string | null, today: string): DueBucket {
  if (!dueDate) return 'no_date'
  if (dueDate < today) return 'overdue'
  if (dueDate === today) return 'today'
  const [y, m, d] = today.split('-').map(Number)
  const weekEnd = new Date(Date.UTC(y, m - 1, d + 6)).toISOString().slice(0, 10)
  return dueDate <= weekEnd ? 'this_week' : 'later'
}

// A person's open tasks grouped by due date, soonest first within each group;
// empty groups are left out and finished tasks are skipped.
export function myWork(tasks: Task[], userId: number, today: string): { bucket: DueBucket; tasks: Task[] }[] {
  const mine = tasks.filter((t) => t.assignee_id === userId && t.status !== 'done')
  return DUE_BUCKETS
    .map((bucket) => ({
      bucket,
      tasks: mine
        .filter((t) => dueBucket(t.due_date, today) === bucket)
        .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '') || a.title.localeCompare(b.title)),
    }))
    .filter((group) => group.tasks.length > 0)
}

export interface TaskSummary {
  total: number
  done: number
  open: number
  // Not done and past due.
  overdue: number
  // Not done and due today or in the next six days.
  due_soon: number
  percent: number
  by_status: Record<TaskStatus, number>
}

// Counts for a dashboard: how many tasks there are, how many are finished, late
// or due soon, and how many sit in each status. `today` is YYYY-MM-DD.
export function taskSummary(tasks: Task[], today: string): TaskSummary {
  const by_status: Record<TaskStatus, number> = { backlog: 0, todo: 0, in_progress: 0, in_review: 0, done: 0 }
  let overdue = 0
  let due_soon = 0
  for (const task of tasks) {
    by_status[task.status] += 1
    if (task.status === 'done') continue
    const bucket = dueBucket(task.due_date, today)
    if (bucket === 'overdue') overdue += 1
    else if (bucket === 'today' || bucket === 'this_week') due_soon += 1
  }
  const done = by_status.done
  return { total: tasks.length, done, open: tasks.length - done, overdue, due_soon, percent: donePercent({ tasks_count: tasks.length, done_tasks_count: done }), by_status }
}

// Open tasks that have a due date, soonest first (overdue ones lead), at most `limit`.
export function upcomingTasks(tasks: Task[], limit = 5): Task[] {
  return tasks
    .filter((t) => t.status !== 'done' && t.due_date)
    .sort((a, b) => a.due_date!.localeCompare(b.due_date!) || a.title.localeCompare(b.title))
    .slice(0, limit)
}

export interface TaskCard {
  task: Task
  epicTitle: string | null
  subtasks: { done: number; total: number }
  overdue: boolean
}

// One card per top-level task for the Cards view: its epic, how many of its
// subtasks (at any depth) are done, and whether it is past due and not done.
// `today` is YYYY-MM-DD.
export function taskCards(tasks: Task[], epics: { id: number; title: string }[], today: string): TaskCard[] {
  const epicTitle = new Map(epics.map((e) => [e.id, e.title]))
  const countBelow = (node: TaskNode): { done: number; total: number } =>
    node.children.reduce((sum, child) => {
      const below = countBelow(child)
      return { done: sum.done + below.done + (child.status === 'done' ? 1 : 0), total: sum.total + below.total + 1 }
    }, { done: 0, total: 0 })
  return buildTaskTree(tasks).map((node) => ({
    task: tasks.find((t) => t.id === node.id)!,
    epicTitle: node.epic_id != null ? epicTitle.get(node.epic_id) ?? null : null,
    subtasks: countBelow(node),
    overdue: !!node.due_date && node.status !== 'done' && node.due_date < today,
  }))
}

export const TASK_PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'none', label: 'No priority' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

// The priority's label, or null when a task has none (so cards show nothing).
export function priorityLabel(priority: TaskPriority | undefined): string | null {
  if (!priority || priority === 'none') return null
  return TASK_PRIORITIES.find((p) => p.value === priority)?.label ?? null
}

// "5 pts" or "5 → 8 pts" (estimated then actual) or "8 pts actual"; null when neither is set.
export function pointsLabel(task: Pick<Task, 'story_points' | 'actual_story_points'>): string | null {
  const { story_points: estimated, actual_story_points: actual } = task
  if (estimated != null && actual != null) return `${estimated} → ${actual} pts`
  if (estimated != null) return `${estimated} pts`
  if (actual != null) return `${actual} pts actual`
  return null
}

// "6.5 h" or null.
export function estimateLabel(hours: number | null | undefined): string | null {
  return hours == null ? null : `${hours} h`
}
