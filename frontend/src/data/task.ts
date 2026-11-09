import { formatDistance, parseISO } from 'date-fns'
import type { Task, TaskKind, TaskPriority } from '@/types'

// The task statuses the API accepts, in board order (mirrors Task.statuses in the backend).
export const TASK_STATUSES: Task['status'][] = ['backlog', 'todo', 'in_progress', 'in_review', 'done']

export const STATUS_LABEL: Record<Task['status'], string> = {
  backlog: 'Backlog',
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
}

// Item types a task can be. A bug appears in the bugs queue (the task list
// filtered to kind = bug); mirrors Task.kinds in the backend.
export const TASK_KINDS: { key: TaskKind; label: string }[] = [
  { key: 'task', label: 'Task' },
  { key: 'bug', label: 'Bug' },
  { key: 'story', label: 'Story' },
]

export const KIND_LABEL: Record<TaskKind, string> = { task: 'Task', bug: 'Bug', story: 'Story' }

// Tasks written before item types existed come back without a kind.
export function kindOf(task: Pick<Task, 'kind'>): TaskKind {
  return task.kind ?? 'task'
}

export function filterByKind<T extends Pick<Task, 'kind'>>(tasks: T[], kind?: TaskKind): T[] {
  return kind ? tasks.filter((t) => kindOf(t) === kind) : tasks
}

export interface TaskNode extends Task { children: TaskNode[] }

// The folder a task sits in: its own, else the one its document is in. That
// folder's board decides how the task's status is named and colored.
export function taskFolderId(task: Pick<Task, 'folder_id' | 'document'>): number | null {
  return task.folder_id ?? task.document?.folder_id ?? null
}

// The levels of subtasks a folder's List view can show at once: just the
// top-level tasks, two levels, or everything (maxDepth null).
export const TASK_LIST_DEPTHS: { label: string; maxDepth: number | null }[] = [
  { label: 'Level 1 only', maxDepth: 0 },
  { label: 'Levels 1–2', maxDepth: 1 },
  { label: 'All levels', maxDepth: null },
]

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

export interface Progress { done: number; total: number; percent: number }

// A task's progress comes from its subtasks, to any depth: every descendant
// counts once and is done when its status is done. A task with no subtasks
// has no progress (null) rather than 0%.
export function subtaskProgress(node: TaskNode): Progress | null {
  let done = 0
  let total = 0
  const walk = (children: TaskNode[]) => children.forEach((c) => {
    total += 1
    if (c.status === 'done') done += 1
    walk(c.children)
  })
  walk(node.children)
  return total === 0 ? null : { done, total, percent: Math.round((done / total) * 100) }
}

// Progress for every task that has subtasks, keyed by task id.
export function progressById(tasks: Task[]): Map<number, Progress> {
  const result = new Map<number, Progress>()
  const visit = (nodes: TaskNode[]) => nodes.forEach((n) => {
    const progress = subtaskProgress(n)
    if (progress) result.set(n.id, progress)
    visit(n.children)
  })
  visit(buildTaskTree(tasks))
  return result
}

// 0 -> "0m", 45 -> "45m", 60 -> "1h", 135 -> "2h 15m".
export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  const h = Math.floor(m / 60)
  const rest = m % 60
  if (h === 0) return `${rest}m`
  return rest === 0 ? `${h}h` : `${h}h ${rest}m`
}

// "1:05:09" for a timer that started at `startedAt`, as of `now`.
export function elapsedClock(startedAt: string, now: Date): string {
  const total = Math.max(0, Math.floor((now.getTime() - new Date(startedAt).getTime()) / 1000))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${Math.floor(total / 3600)}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`
}

const STATUS_NAME: Record<Task['status'], string> = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' }

// "Created as To Do" or "To Do → Done", for one row of a task's history.
export function statusChangeLabel(change: { from_status: Task['status'] | null; to_status: Task['status'] }): string {
  return change.from_status ? `${STATUS_NAME[change.from_status]} → ${STATUS_NAME[change.to_status]}` : `Created as ${STATUS_NAME[change.to_status]}`
}

// A task's editable fields as form strings ('' = none).
export interface TaskDraft {
  title: string
  description: string
  status: Task['status']
  start_date: string
  due_date: string
  epic_id: string
  sprint_id: string
  milestone_id: string
}

export function taskDraft(task: Task): TaskDraft {
  return {
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    start_date: task.start_date ?? '',
    due_date: task.due_date ?? '',
    epic_id: task.epic_id != null ? String(task.epic_id) : '',
    sprint_id: task.sprint_id != null ? String(task.sprint_id) : '',
    milestone_id: task.milestone_id != null ? String(task.milestone_id) : '',
  }
}

// Why the draft can't be saved, or null.
export function taskDraftError(draft: TaskDraft): string | null {
  if (!draft.title.trim()) return 'A task needs a title.'
  if (draft.start_date && draft.due_date && draft.due_date < draft.start_date) return 'The due date is before the start date.'
  return null
}

// Only the fields that differ from the task, ready for PATCH (empty = cleared).
// Empty when nothing changed.
export function taskChanges(task: Task, draft: TaskDraft): Partial<Task> {
  const before = taskDraft(task)
  const changes: Partial<Task> = {}
  const text = (key: 'title' | 'description' | 'status') => {
    const value = key === 'title' ? draft.title.trim() : draft[key]
    if (value !== before[key]) Object.assign(changes, { [key]: value })
  }
  text('title'); text('description'); text('status')
  for (const key of ['start_date', 'due_date'] as const) {
    if (draft[key] !== before[key]) changes[key] = draft[key] || null
  }
  for (const key of ['epic_id', 'sprint_id', 'milestone_id'] as const) {
    if (draft[key] !== before[key]) changes[key] = draft[key] ? Number(draft[key]) : null
  }
  return changes
}

export type AutoFieldSource = Pick<Task, 'id' | 'created_by_name' | 'created_at' | 'updated_at'>

// The read-only fields the server fills in: item ID, creator, and when the
// task was created and last updated ("2 days ago"). What the server does not
// know is null. `now` is passed in so the wording can be tested.
export function autoFields(task: AutoFieldSource, now: Date = new Date()) {
  const ago = (iso?: string) => (iso ? formatDistance(parseISO(iso), now, { addSuffix: true }) : null)
  return {
    itemId: `#${task.id}`,
    createdBy: task.created_by_name ?? null,
    created: ago(task.created_at),
    updated: ago(task.updated_at),
  }
}
