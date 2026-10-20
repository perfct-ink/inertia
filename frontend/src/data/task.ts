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
