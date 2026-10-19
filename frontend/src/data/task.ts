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
