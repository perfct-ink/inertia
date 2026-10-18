import type { Milestone, Initiative, Epic, Task } from '@/types'
import { buildTaskTree, type TaskNode } from '@/data/task'

// Normalizes Milestone/Initiative/Epic/Task into one shape so a single
// recursive view can render all four levels. Nesting follows the structural
// parent when one exists (epic_id, parent_id); an item with no structural
// parent falls back to its own milestone_id, same as the server's
// MilestoneRollup inheritance (task -> epic -> initiative). Anything with
// neither is "unassigned" rather than silently dropped.
export type HierarchyKind = 'milestone' | 'initiative' | 'epic' | 'task'

export interface HierarchyNode {
  key: string
  kind: HierarchyKind
  id: number
  title: string
  tasksCount: number
  doneTasksCount: number
  children: HierarchyNode[]
}

// A task's own rollup isn't served by the API (only Milestone/Initiative/
// Epic get one) — compute it here from the subtask tree: itself plus every
// descendant.
function taskNodeToHierarchy(node: TaskNode): HierarchyNode {
  const children = node.children.map(taskNodeToHierarchy)
  const tasksCount = 1 + children.reduce((sum, c) => sum + c.tasksCount, 0)
  const doneTasksCount = (node.status === 'done' ? 1 : 0) + children.reduce((sum, c) => sum + c.doneTasksCount, 0)
  return { key: `task-${node.id}`, kind: 'task', id: node.id, title: node.title, tasksCount, doneTasksCount, children }
}

export function buildHierarchy(
  milestones: Milestone[],
  initiatives: Initiative[],
  epics: Epic[],
  tasks: Task[],
): { tree: HierarchyNode[]; unassigned: HierarchyNode[] } {
  const taskRoots = buildTaskTree(tasks)
  const taskNodesByEpic = new Map<number, HierarchyNode[]>()
  const orphanTaskEntries: { task: Task; node: HierarchyNode }[] = []

  taskRoots.forEach((root) => {
    const node = taskNodeToHierarchy(root)
    if (root.epic_id != null) {
      const list = taskNodesByEpic.get(root.epic_id) ?? []
      list.push(node)
      taskNodesByEpic.set(root.epic_id, list)
    } else {
      orphanTaskEntries.push({ task: root, node })
    }
  })

  const epicsByInitiative = new Map<number, HierarchyNode[]>()
  const orphanEpicEntries: { epic: Epic; node: HierarchyNode }[] = []
  epics.forEach((epic) => {
    const node: HierarchyNode = {
      key: `epic-${epic.id}`,
      kind: 'epic',
      id: epic.id,
      title: epic.title,
      tasksCount: epic.tasks_count,
      doneTasksCount: epic.done_tasks_count,
      children: taskNodesByEpic.get(epic.id) ?? [],
    }
    if (epic.initiative_id != null) {
      const list = epicsByInitiative.get(epic.initiative_id) ?? []
      list.push(node)
      epicsByInitiative.set(epic.initiative_id, list)
    } else {
      orphanEpicEntries.push({ epic, node })
    }
  })

  const topLevelByMilestone = new Map<number, HierarchyNode[]>()
  const unassigned: HierarchyNode[] = []

  function placeByMilestone(node: HierarchyNode, milestoneId: number | null | undefined) {
    if (milestoneId != null) {
      const list = topLevelByMilestone.get(milestoneId) ?? []
      list.push(node)
      topLevelByMilestone.set(milestoneId, list)
    } else {
      unassigned.push(node)
    }
  }

  initiatives.forEach((initiative) => {
    const node: HierarchyNode = {
      key: `initiative-${initiative.id}`,
      kind: 'initiative',
      id: initiative.id,
      title: initiative.title,
      tasksCount: initiative.tasks_count,
      doneTasksCount: initiative.done_tasks_count,
      children: epicsByInitiative.get(initiative.id) ?? [],
    }
    placeByMilestone(node, initiative.milestone_id)
  })
  orphanEpicEntries.forEach(({ epic, node }) => placeByMilestone(node, epic.milestone_id))
  orphanTaskEntries.forEach(({ task, node }) => placeByMilestone(node, task.milestone_id))

  const tree: HierarchyNode[] = milestones.map((milestone) => ({
    key: `milestone-${milestone.id}`,
    kind: 'milestone',
    id: milestone.id,
    title: milestone.title,
    tasksCount: milestone.tasks_count,
    doneTasksCount: milestone.done_tasks_count,
    children: topLevelByMilestone.get(milestone.id) ?? [],
  }))

  return { tree, unassigned }
}

// Where a drag can end: a node, or the "Unassigned" section (null target).
export type DropTarget = Pick<HierarchyNode, 'kind' | 'id'> | null

export type Reparent =
  | { kind: 'initiative'; id: number; changes: { milestone_id: number | null } }
  | { kind: 'epic'; id: number; changes: { initiative_id: number | null; milestone_id: number | null } }
  | { kind: 'task'; id: number; changes: { epic_id?: number | null; parent_id: number | null; milestone_id?: number | null } }

function containsNode(node: HierarchyNode, kind: HierarchyKind, id: number): boolean {
  return node.children.some((c) => (c.kind === kind && c.id === id) || containsNode(c, kind, id))
}

// The update that moves `dragged` under `target`, or null when the drop isn't
// allowed (milestones never move; each level only accepts the level above it,
// except tasks, which also nest under tasks; a task can't land in its own
// subtree). Dropping on Unassigned detaches the item from every parent. The
// server re-checks cycles and Space membership (Task#parent_is_not_self_or_a_descendant,
// SameWorkspace), so this only decides what the UI offers.
export function reparentChanges(dragged: HierarchyNode, target: DropTarget): Reparent | null {
  const to = target?.kind
  switch (dragged.kind) {
    case 'initiative':
      if (target && to !== 'milestone') return null
      return { kind: 'initiative', id: dragged.id, changes: { milestone_id: target?.id ?? null } }
    case 'epic':
      if (target && to !== 'initiative' && to !== 'milestone') return null
      return {
        kind: 'epic',
        id: dragged.id,
        changes: { initiative_id: to === 'initiative' ? target!.id : null, milestone_id: to === 'milestone' ? target!.id : null },
      }
    case 'task':
      if (target && to === 'initiative') return null
      if (to === 'task' && (target!.id === dragged.id || containsNode(dragged, 'task', target!.id))) return null
      // Nesting under another task only sets parent_id: the subtask keeps its
      // own epic_id so the epic's task counts don't change underneath it.
      if (to === 'task') return { kind: 'task', id: dragged.id, changes: { parent_id: target!.id } }
      return {
        kind: 'task',
        id: dragged.id,
        changes: {
          epic_id: to === 'epic' ? target!.id : null,
          parent_id: null,
          milestone_id: to === 'milestone' ? target!.id : null,
        },
      }
    default:
      return null
  }
}
