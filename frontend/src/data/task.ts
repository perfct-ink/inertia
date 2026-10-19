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

export interface EpicLane { key: string; title: string; epicId: number | null; tasks: Task[] }

// Workboard swimlanes: one lane per epic that has tasks (in the epics' order),
// then a "No epic" lane for tasks whose epic is missing or unset. Empty lanes
// are left out.
export function epicLanes(tasks: Task[], epics: { id: number; title: string }[]): EpicLane[] {
  const known = new Set(epics.map((e) => e.id))
  const lanes: EpicLane[] = epics.map((e) => ({ key: `epic-${e.id}`, title: e.title, epicId: e.id, tasks: tasks.filter((t) => t.epic_id === e.id) }))
  lanes.push({ key: 'no-epic', title: 'No epic', epicId: null, tasks: tasks.filter((t) => t.epic_id == null || !known.has(t.epic_id)) })
  return lanes.filter((lane) => lane.tasks.length > 0)
}
