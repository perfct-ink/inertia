import type { Task } from '@/types'

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
