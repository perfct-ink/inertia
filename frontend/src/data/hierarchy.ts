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
  // Order among siblings of the same kind (initiatives, epics and tasks carry
  // a `position`; milestones keep the order the API returns them in).
  position: number
  tasksCount: number
  doneTasksCount: number
  children: HierarchyNode[]
}

export interface Hierarchy {
  tree: HierarchyNode[]
  unassigned: HierarchyNode[]
}

// Display names, for labels and messages.
export const KIND_LABEL: Record<HierarchyKind, string> = {
  milestone: 'Milestone',
  initiative: 'Initiative',
  epic: 'Epic',
  task: 'Task',
}

// A parent can hold a mix of levels (a milestone holds initiatives, loose
// epics and loose tasks), shown highest level first; within a level, by
// position and then id so ties are stable.
const KIND_RANK: Record<HierarchyKind, number> = { milestone: 0, initiative: 1, epic: 2, task: 3 }

export function compareNodes(a: HierarchyNode, b: HierarchyNode): number {
  return KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.position - b.position || a.id - b.id
}

function sortChildren(nodes: HierarchyNode[]): HierarchyNode[] {
  nodes.sort(compareNodes)
  nodes.forEach((node) => sortChildren(node.children))
  return nodes
}

// A task's own rollup isn't served by the API (only Milestone/Initiative/
// Epic get one) — compute it here from the subtask tree: itself plus every
// descendant.
function taskNodeToHierarchy(node: TaskNode): HierarchyNode {
  const children = node.children.map(taskNodeToHierarchy)
  const tasksCount = 1 + children.reduce((sum, c) => sum + c.tasksCount, 0)
  const doneTasksCount = (node.status === 'done' ? 1 : 0) + children.reduce((sum, c) => sum + c.doneTasksCount, 0)
  return { key: `task-${node.id}`, kind: 'task', id: node.id, title: node.title, position: node.position ?? 0, tasksCount, doneTasksCount, children }
}

export function buildHierarchy(
  milestones: Milestone[],
  initiatives: Initiative[],
  epics: Epic[],
  tasks: Task[],
): Hierarchy {
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
      position: epic.position ?? 0,
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
      position: initiative.position ?? 0,
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
    position: 0,
    tasksCount: milestone.tasks_count,
    doneTasksCount: milestone.done_tasks_count,
    children: topLevelByMilestone.get(milestone.id) ?? [],
  }))

  // Milestones stay in the order the API gives them; everything below is ordered.
  tree.forEach((milestone) => sortChildren(milestone.children))
  sortChildren(unassigned)
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

// ---- Ordering and the moves that carry it -------------------------------
//
// Items sit in order among siblings of their own level, kept in `position`
// (initiatives, epics and tasks). A move is "put this item under that parent,
// at that place": planMove turns it into the PATCH for the item itself plus,
// only when the neighbours have no room left between them, new positions for
// the siblings that shift. Drops (pointer) and the Move dialog (keyboard and
// touch) both go through it, so they behave the same.

export type ItemKind = Exclude<HierarchyKind, 'milestone'>

export interface ItemUpdate {
  kind: ItemKind
  id: number
  changes: Partial<Record<'milestone_id' | 'initiative_id' | 'epic_id' | 'parent_id' | 'position', number | null>>
}

export interface MovePlan {
  // The item being moved: its new parent (when it changes) and its position.
  item: ItemUpdate
  // Siblings that need a new position to make room. Sent after `item` is accepted.
  reorders: ItemUpdate[]
  // Start of the error notice if the server rejects `item` / `reorders`.
  failure: string
  orderFailure: string
}

export const UNASSIGNED_KEY = 'unassigned'
// Pass as the index to land after every sibling.
export const END_OF_LIST = Number.POSITIVE_INFINITY

export interface NodeLocation {
  parent: HierarchyNode | null
  siblings: HierarchyNode[]
}

// Where `key` sits now: its parent (null for Unassigned and for milestones)
// and the list it is in.
export function locateNode(hierarchy: Hierarchy, key: string): NodeLocation | null {
  function search(siblings: HierarchyNode[], parent: HierarchyNode | null): NodeLocation | null {
    for (const node of siblings) {
      if (node.key === key) return { parent, siblings }
      const found = search(node.children, node)
      if (found) return found
    }
    return null
  }
  return search(hierarchy.tree, null) ?? search(hierarchy.unassigned, null)
}

export function findNode(hierarchy: Hierarchy, key: string): HierarchyNode | null {
  return locateNode(hierarchy, key)?.siblings.find((node) => node.key === key) ?? null
}

// The items `dragged` is ordered against under `parent`: same level, minus itself.
function orderedSiblings(hierarchy: Hierarchy, dragged: HierarchyNode, parent: HierarchyNode | null): HierarchyNode[] {
  return (parent ? parent.children : hierarchy.unassigned).filter((c) => c.kind === dragged.kind && c.key !== dragged.key)
}

// The position for an item inserted at `index` among `siblings` (already
// sorted, without the item). Takes a number between its neighbours; when they
// are adjacent, numbers the whole list again and reports which siblings moved.
export function placeAt(
  siblings: Pick<HierarchyNode, 'id' | 'position'>[],
  index: number,
): { position: number; shifts: { id: number; position: number }[] } {
  const count = siblings.length
  const at = Math.min(Math.max(index, 0), count)
  if (count === 0) return { position: 0, shifts: [] }
  if (at === count) return { position: siblings[count - 1].position + 1, shifts: [] }
  if (at === 0) return { position: siblings[0].position - 1, shifts: [] }
  const before = siblings[at - 1].position
  const after = siblings[at].position
  if (after - before >= 2) return { position: Math.floor((before + after) / 2), shifts: [] }
  const shifts = siblings
    .map((sibling, i) => ({ id: sibling.id, position: i < at ? i : i + 1, was: sibling.position }))
    .filter((s) => s.position !== s.was)
    .map(({ id, position }) => ({ id, position }))
  return { position: at, shifts }
}

// The plan for putting `dragged` under `parent` (null = Unassigned) at `index`
// among the items of its level there (END_OF_LIST for last), or null when the
// move isn't allowed (see reparentChanges) or nothing would change.
export function planMove(hierarchy: Hierarchy, dragged: HierarchyNode, parent: HierarchyNode | null, index: number): MovePlan | null {
  const reparent = reparentChanges(dragged, parent)
  const from = locateNode(hierarchy, dragged.key)
  if (!reparent || !from) return null

  const others = orderedSiblings(hierarchy, dragged, parent)
  const at = Math.min(Math.max(index, 0), others.length)
  const reparented = (from.parent?.key ?? null) !== (parent?.key ?? null)
  const currentIndex = from.siblings.filter((s) => s.kind === dragged.kind).findIndex((s) => s.key === dragged.key)
  if (!reparented && currentIndex === at) return null

  const { position, shifts } = placeAt(others, at)
  const title = dragged.title
  return {
    item: { kind: reparent.kind, id: reparent.id, changes: { ...(reparented ? reparent.changes : {}), position } },
    reorders: shifts.map((shift) => ({ kind: reparent.kind, id: shift.id, changes: { position: shift.position } })),
    failure: !reparented
      ? `Couldn't reorder "${title}"`
      : parent ? `Couldn't move "${title}" under "${parent.title}"` : `Couldn't move "${title}" to Unassigned`,
    orderFailure: `"${title}" moved, but the new order wasn't saved`,
  }
}

// Which part of a row the pointer is in: the top edge puts the item before it,
// the bottom edge after it, the middle inside it. `canOrder` is true when the
// row is a sibling of the dragged item; `canNest` when the item can go inside
// it. With both on, the edges are the outer 30% of the row; with only ordering,
// the row splits in halves. Null when the row accepts neither.
export interface DropOptions { canOrder: boolean; canNest: boolean }
export type Placement = 'before' | 'inside' | 'after'

const EDGE = 0.3

export function dropOptions(dragged: HierarchyNode, over: HierarchyNode): DropOptions {
  return {
    canOrder:
      over.kind !== 'milestone' && over.kind === dragged.kind && over.key !== dragged.key && !containsNode(dragged, over.kind, over.id),
    canNest: reparentChanges(dragged, over) !== null,
  }
}

export function dropPlacement(offset: number, height: number, { canOrder, canNest }: DropOptions): Placement | null {
  if (!canOrder) return canNest ? 'inside' : null
  const ratio = height > 0 ? offset / height : 0.5
  if (!canNest) return ratio < 0.5 ? 'before' : 'after'
  return ratio < EDGE ? 'before' : ratio > 1 - EDGE ? 'after' : 'inside'
}

// The plan for a drop on `over` (null = the Unassigned section) at `placement`.
export function planDrop(hierarchy: Hierarchy, dragged: HierarchyNode, over: HierarchyNode | null, placement: Placement): MovePlan | null {
  if (!over || placement === 'inside' || over.kind !== dragged.kind) return planMove(hierarchy, dragged, over, END_OF_LIST)
  const at = locateNode(hierarchy, over.key)
  if (!at || over.key === dragged.key) return null
  const index = orderedSiblings(hierarchy, dragged, at.parent).findIndex((s) => s.key === over.key)
  return planMove(hierarchy, dragged, at.parent, index + (placement === 'after' ? 1 : 0))
}

// ---- The Move dialog -------------------------------------------------------

export interface MoveDestination {
  key: string
  label: string
  parent: HierarchyNode | null
}

// Every parent `dragged` can go under, as a path ("Epic: Beta > Growth >
// Checkout") so same-named items can be told apart, and Unassigned last.
export function moveDestinations(hierarchy: Hierarchy, dragged: HierarchyNode): MoveDestination[] {
  const found: MoveDestination[] = []
  function visit(node: HierarchyNode, path: string[]) {
    const here = [...path, node.title]
    if (reparentChanges(dragged, node)) found.push({ key: node.key, label: `${KIND_LABEL[node.kind]}: ${here.join(' > ')}`, parent: node })
    node.children.forEach((child) => visit(child, here))
  }
  hierarchy.tree.forEach((node) => visit(node, []))
  hierarchy.unassigned.forEach((node) => visit(node, []))
  found.push({ key: UNASSIGNED_KEY, label: 'Unassigned (no parent)', parent: null })
  return found
}

export interface MoveSlot {
  index: number
  label: string
}

// The places `dragged` can take among its level under `parent`: first, or
// after each item already there.
export function moveSlots(hierarchy: Hierarchy, dragged: HierarchyNode, parent: HierarchyNode | null): MoveSlot[] {
  const others = orderedSiblings(hierarchy, dragged, parent)
  return [{ index: 0, label: 'First' }, ...others.map((sibling, i) => ({ index: i + 1, label: `After "${sibling.title}"` }))]
}

// Where `dragged` sits now, in the terms the dialog offers.
export function currentPlace(hierarchy: Hierarchy, dragged: HierarchyNode): { destination: string; index: number } {
  const from = locateNode(hierarchy, dragged.key)
  if (!from) return { destination: UNASSIGNED_KEY, index: 0 }
  return {
    destination: from.parent?.key ?? UNASSIGNED_KEY,
    index: from.siblings.filter((s) => s.kind === dragged.kind).findIndex((s) => s.key === dragged.key),
  }
}
