import type { Task, TaskPriority } from '@/types'

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
