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
