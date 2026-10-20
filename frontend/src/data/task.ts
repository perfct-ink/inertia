import type { Task, TaskKind } from '@/types'

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
