import type { Task } from '@/types'

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
