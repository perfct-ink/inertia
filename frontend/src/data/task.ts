import type { Task } from '@/types'

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

const STATUS_NAME: Record<Task['status'], string> = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' }

// "Created as To Do" or "To Do → Done", for one row of a task's history.
export function statusChangeLabel(change: { from_status: Task['status'] | null; to_status: Task['status'] }): string {
  return change.from_status ? `${STATUS_NAME[change.from_status]} → ${STATUS_NAME[change.to_status]}` : `Created as ${STATUS_NAME[change.to_status]}`
}
