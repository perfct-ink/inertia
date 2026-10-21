import { formatDistance } from 'date-fns'
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

// The read-only fields the server fills in: item ID, creator and timestamps.
// `now` is passed in so the "ago" wording can be tested.
export function autoFields(task: Pick<Task, 'id' | 'created_by_name' | 'created_at' | 'updated_at'>, now: Date = new Date()) {
  return {
    itemId: `#${task.id}`,
    createdBy: task.created_by_name ?? null,
    created: task.created_at ? formatDistance(new Date(task.created_at), now, { addSuffix: true }) : null,
    updated: task.updated_at ? formatDistance(new Date(task.updated_at), now, { addSuffix: true }) : null,
  }
}
