import type { Milestone, Initiative, Epic, Task } from '@/types'
import {
  buildHierarchy, reparentChanges, locateNode, findNode, placeAt, planMove, planDrop, dropOptions, dropPlacement,
  moveDestinations, moveSlots, currentPlace, END_OF_LIST, UNASSIGNED_KEY, type Hierarchy, type HierarchyNode,
} from './hierarchy'

const milestone = (id: number) => ({ id, title: `M${id}`, tasks_count: 0, done_tasks_count: 0 }) as unknown as Milestone
const initiative = (id: number, milestone_id: number | null = null, position = 0) =>
  ({ id, title: `I${id}`, milestone_id, position, tasks_count: 0, done_tasks_count: 0 }) as unknown as Initiative
const epic = (id: number, initiative_id: number | null = null, milestone_id: number | null = null, position = 0) =>
  ({ id, title: `E${id}`, initiative_id, milestone_id, position, tasks_count: 0, done_tasks_count: 0 }) as unknown as Epic
const task = (id: number, opts: { epic_id?: number | null; milestone_id?: number | null; parent_id?: number | null; status?: Task['status']; position?: number } = {}) =>
  ({ id, title: `T${id}`, status: 'todo', epic_id: null, milestone_id: null, parent_id: null, position: 0, ...opts }) as unknown as Task

test('nests the full chain: milestone -> initiative -> epic -> task', () => {
  const { tree } = buildHierarchy(
    [milestone(1)],
    [initiative(1, 1)],
    [epic(1, 1)],
    [task(1, { epic_id: 1 })],
  )
  expect(tree[0].children[0].kind).toBe('initiative')
  expect(tree[0].children[0].children[0].kind).toBe('epic')
  expect(tree[0].children[0].children[0].children[0].kind).toBe('task')
})

test('an epic with no initiative falls back to its own milestone_id', () => {
  const { tree } = buildHierarchy([milestone(1)], [], [epic(1, null, 1)], [])
  expect(tree[0].children[0]).toMatchObject({ kind: 'epic', id: 1 })
})

test('a task with no epic falls back to its own milestone_id', () => {
  const { tree } = buildHierarchy([milestone(1)], [], [], [task(1, { milestone_id: 1 })])
  expect(tree[0].children[0]).toMatchObject({ kind: 'task', id: 1 })
})

test('an item with no structural parent and no milestone_id is unassigned, not dropped', () => {
  const { tree, unassigned } = buildHierarchy([], [], [epic(1)], [])
  expect(tree).toEqual([])
  expect(unassigned).toMatchObject([{ kind: 'epic', id: 1 }])
})

test("a task's rollup counts itself plus every descendant subtask", () => {
  const { unassigned } = buildHierarchy(
    [],
    [],
    [],
    [task(1, { status: 'done' }), task(2, { parent_id: 1, status: 'done' }), task(3, { parent_id: 2, status: 'todo' })],
  )
  expect(unassigned[0]).toMatchObject({ tasksCount: 3, doneTasksCount: 2 })
})

const node = (kind: HierarchyNode['kind'], id: number, children: HierarchyNode[] = []): HierarchyNode =>
  ({ key: `${kind}-${id}`, kind, id, title: '', position: 0, tasksCount: 0, doneTasksCount: 0, children })

test('reparentChanges only offers the level above, plus task-in-task', () => {
  expect(reparentChanges(node('initiative', 1), { kind: 'milestone', id: 2 })?.changes).toEqual({ milestone_id: 2 })
  expect(reparentChanges(node('initiative', 1), { kind: 'epic', id: 2 })).toBeNull()
  expect(reparentChanges(node('epic', 1), { kind: 'initiative', id: 2 })?.changes).toEqual({ initiative_id: 2, milestone_id: null })
  expect(reparentChanges(node('epic', 1), { kind: 'milestone', id: 2 })?.changes).toEqual({ initiative_id: null, milestone_id: 2 })
  expect(reparentChanges(node('task', 1), { kind: 'epic', id: 2 })?.changes).toEqual({ epic_id: 2, parent_id: null, milestone_id: null })
  expect(reparentChanges(node('task', 1), { kind: 'initiative', id: 2 })).toBeNull()
  expect(reparentChanges(node('milestone', 1), { kind: 'milestone', id: 2 })).toBeNull()
})

test('reparentChanges blocks a task dropped into itself or its own subtree', () => {
  const parent = node('task', 1, [node('task', 2, [node('task', 3)])])
  expect(reparentChanges(parent, { kind: 'task', id: 1 })).toBeNull()
  expect(reparentChanges(parent, { kind: 'task', id: 3 })).toBeNull()
  expect(reparentChanges(node('task', 3), { kind: 'task', id: 1 })?.changes).toEqual({ parent_id: 1 })
})

test('reparentChanges detaches on the Unassigned section', () => {
  expect(reparentChanges(node('initiative', 1), null)?.changes).toEqual({ milestone_id: null })
  expect(reparentChanges(node('epic', 1), null)?.changes).toEqual({ initiative_id: null, milestone_id: null })
  expect(reparentChanges(node('task', 1), null)?.changes).toEqual({ epic_id: null, parent_id: null, milestone_id: null })
})

const keys = (nodes: HierarchyNode[]) => nodes.map((n) => n.key)

test('siblings are ordered by position, then id, with the higher levels first', () => {
  const { tree } = buildHierarchy(
    [milestone(1)],
    [initiative(1, 1, 5)],
    [epic(1, null, 1, 0), epic(2, null, 1, -1), epic(3, 1, null, 2), epic(4, 1, null, 1)],
    [task(1, { milestone_id: 1, position: 3 }), task(2, { milestone_id: 1, position: 3 }), task(3, { milestone_id: 1, position: -4 })],
  )
  expect(keys(tree[0].children)).toEqual(['initiative-1', 'epic-2', 'epic-1', 'task-3', 'task-1', 'task-2'])
  expect(keys(tree[0].children[0].children)).toEqual(['epic-4', 'epic-3'])
})

test("subtasks and an epic's tasks are ordered by position too", () => {
  const { tree } = buildHierarchy(
    [milestone(1)],
    [],
    [epic(1, null, 1)],
    [
      task(1, { epic_id: 1, position: 2 }), task(2, { epic_id: 1, position: 1 }),
      task(3, { parent_id: 2, epic_id: 1, position: 9 }), task(4, { parent_id: 2, epic_id: 1, position: 8 }),
    ],
  )
  const epicNode = tree[0].children[0]
  expect(keys(epicNode.children)).toEqual(['task-2', 'task-1'])
  expect(keys(epicNode.children[0].children)).toEqual(['task-4', 'task-3'])
})

test('milestones keep the order they are given in', () => {
  const { tree } = buildHierarchy([milestone(3), milestone(1), milestone(2)], [], [], [])
  expect(keys(tree)).toEqual(['milestone-3', 'milestone-1', 'milestone-2'])
})

test('placeAt appends, prepends and fits between neighbours without touching siblings', () => {
  const list = [{ id: 1, position: 0 }, { id: 2, position: 10 }]
  expect(placeAt([], 0)).toEqual({ position: 0, shifts: [] })
  expect(placeAt(list, END_OF_LIST)).toEqual({ position: 11, shifts: [] })
  expect(placeAt(list, 0)).toEqual({ position: -1, shifts: [] })
  expect(placeAt(list, 1)).toEqual({ position: 5, shifts: [] })
  expect(placeAt(list, 99)).toEqual({ position: 11, shifts: [] })
  expect(placeAt(list, -3)).toEqual({ position: -1, shifts: [] })
})

test('placeAt numbers the list again when the neighbours are adjacent or tied', () => {
  const tied = [{ id: 1, position: 0 }, { id: 2, position: 0 }, { id: 3, position: 0 }]
  expect(placeAt(tied, 1)).toEqual({ position: 1, shifts: [{ id: 2, position: 2 }, { id: 3, position: 3 }] })
  const adjacent = [{ id: 1, position: 4 }, { id: 2, position: 5 }]
  expect(placeAt(adjacent, 1)).toEqual({ position: 1, shifts: [{ id: 1, position: 0 }, { id: 2, position: 2 }] })
})

// M1 holds initiative I1 (epics E1 at 0, E2 at 5, E3 at 6), a loose epic E4 and
// loose tasks T5 (2) and T6 (6); E1 holds tasks T1 (with subtask T3) and T2.
// Only epic E9 and task T9 are unassigned.
function sample(): Hierarchy {
  return buildHierarchy(
    [milestone(1), milestone(2)],
    [initiative(1, 1), initiative(2, 2)],
    [epic(1, 1, null, 0), epic(2, 1, null, 5), epic(3, 1, null, 6), epic(4, null, 1), epic(9)],
    [
      task(1, { epic_id: 1, position: 0 }), task(2, { epic_id: 1, position: 1 }), task(3, { parent_id: 1, epic_id: 1 }),
      task(5, { milestone_id: 1, position: 2 }), task(6, { milestone_id: 1, position: 6 }), task(9),
    ],
  )
}
const find = (h: Hierarchy, key: string) => findNode(h, key)!

test('locateNode finds the parent and sibling list, in the tree or Unassigned', () => {
  const h = sample()
  expect(locateNode(h, 'epic-2')?.parent?.key).toBe('initiative-1')
  expect(keys(locateNode(h, 'epic-2')!.siblings)).toEqual(['epic-1', 'epic-2', 'epic-3'])
  expect(locateNode(h, 'task-3')?.parent?.key).toBe('task-1')
  expect(locateNode(h, 'epic-9')?.parent).toBeNull()
  expect(keys(locateNode(h, 'epic-9')!.siblings)).toEqual(['epic-9', 'task-9'])
  expect(locateNode(h, 'nope')).toBeNull()
  expect(findNode(h, 'epic-2')?.title).toBe('E2')
  expect(findNode(h, 'nope')).toBeNull()
})

test('planMove reorders within the same parent with one position and no parent change', () => {
  const h = sample()
  // E3 to the front of I1's epics: before E1 (position 0) -> -1.
  const plan = planMove(h, find(h, 'epic-3'), find(h, 'initiative-1'), 0)!
  expect(plan.item).toEqual({ kind: 'epic', id: 3, changes: { position: -1 } })
  expect(plan.reorders).toEqual([])
  expect(plan.failure).toBe('Couldn\'t reorder "E3"')
  // E1 between E2 (5) and E3 (6): no room, so the others are numbered again.
  const squeezed = planMove(h, find(h, 'epic-1'), find(h, 'initiative-1'), 1)!
  expect(squeezed.item.changes).toEqual({ position: 1 })
  expect(squeezed.reorders).toEqual([{ kind: 'epic', id: 2, changes: { position: 0 } }, { kind: 'epic', id: 3, changes: { position: 2 } }])
})

test('planMove does nothing when the item would stay where it is', () => {
  const h = sample()
  expect(planMove(h, find(h, 'epic-2'), find(h, 'initiative-1'), 1)).toBeNull()
  expect(planMove(h, find(h, 'epic-3'), find(h, 'initiative-1'), END_OF_LIST)).toBeNull()
  expect(planMove(h, find(h, 'epic-9'), null, 0)).toBeNull()
})

test('planMove reparents and positions in one update', () => {
  const h = sample()
  const toInitiative = planMove(h, find(h, 'epic-4'), find(h, 'initiative-1'), END_OF_LIST)!
  expect(toInitiative.item).toEqual({ kind: 'epic', id: 4, changes: { initiative_id: 1, milestone_id: null, position: 7 } })
  expect(toInitiative.reorders).toEqual([])
  expect(toInitiative.failure).toBe('Couldn\'t move "E4" under "I1"')

  // A task becomes a subtask of T2, as its only child.
  const toTask = planMove(h, find(h, 'task-5'), find(h, 'task-2'), END_OF_LIST)!
  expect(toTask.item).toEqual({ kind: 'task', id: 5, changes: { parent_id: 2, position: 0 } })

  // Out to Unassigned, after the loose epic.
  const toUnassigned = planMove(h, find(h, 'epic-4'), null, END_OF_LIST)!
  expect(toUnassigned.item).toEqual({ kind: 'epic', id: 4, changes: { initiative_id: null, milestone_id: null, position: 1 } })
  expect(toUnassigned.failure).toBe('Couldn\'t move "E4" to Unassigned')
  expect(toUnassigned.orderFailure).toBe('"E4" moved, but the new order wasn\'t saved')
})

test('planMove refuses moves reparentChanges refuses', () => {
  const h = sample()
  expect(planMove(h, find(h, 'task-1'), find(h, 'task-3'), 0)).toBeNull()
  expect(planMove(h, find(h, 'task-1'), find(h, 'initiative-1'), 0)).toBeNull()
  expect(planMove(h, find(h, 'milestone-1'), null, 0)).toBeNull()
})

test('dropPlacement splits a row by where the pointer is', () => {
  const both = { canOrder: true, canNest: true }
  expect(dropPlacement(2, 40, both)).toBe('before')
  expect(dropPlacement(20, 40, both)).toBe('inside')
  expect(dropPlacement(38, 40, both)).toBe('after')
  const orderOnly = { canOrder: true, canNest: false }
  expect(dropPlacement(19, 40, orderOnly)).toBe('before')
  expect(dropPlacement(21, 40, orderOnly)).toBe('after')
  expect(dropPlacement(2, 40, { canOrder: false, canNest: true })).toBe('inside')
  expect(dropPlacement(2, 40, { canOrder: false, canNest: false })).toBeNull()
})

test('dropOptions orders among same-level rows and never into the item itself or its subtree', () => {
  const h = sample()
  expect(dropOptions(find(h, 'epic-1'), find(h, 'epic-2'))).toEqual({ canOrder: true, canNest: false })
  expect(dropOptions(find(h, 'task-5'), find(h, 'task-6'))).toEqual({ canOrder: true, canNest: true })
  expect(dropOptions(find(h, 'epic-1'), find(h, 'epic-1'))).toEqual({ canOrder: false, canNest: false })
  expect(dropOptions(find(h, 'task-1'), find(h, 'task-3'))).toEqual({ canOrder: false, canNest: false })
  expect(dropOptions(find(h, 'epic-1'), find(h, 'initiative-2'))).toEqual({ canOrder: false, canNest: true })
  expect(dropOptions(find(h, 'epic-1'), find(h, 'task-5'))).toEqual({ canOrder: false, canNest: false })
})

test('planDrop turns an edge drop into a move beside the row and a middle drop into a move inside it', () => {
  const h = sample()
  // Before E2 under I1: between E1 (0) and E2 (5).
  const before = planDrop(h, find(h, 'epic-3'), find(h, 'epic-2'), 'before')!
  expect(before.item).toEqual({ kind: 'epic', id: 3, changes: { position: 2 } })
  // After E3 (the last), from a different parent: reparented and appended.
  const after = planDrop(h, find(h, 'epic-4'), find(h, 'epic-3'), 'after')!
  expect(after.item).toEqual({ kind: 'epic', id: 4, changes: { initiative_id: 1, milestone_id: null, position: 7 } })
  // Before a loose task under a milestone: the task leaves its epic for that milestone.
  const loose = planDrop(h, find(h, 'task-1'), find(h, 'task-6'), 'before')!
  expect(loose.item).toEqual({ kind: 'task', id: 1, changes: { epic_id: null, parent_id: null, milestone_id: 1, position: 4 } })
  expect(loose.reorders).toEqual([])
  // Inside a task: nest it.
  expect(planDrop(h, find(h, 'task-5'), find(h, 'task-6'), 'inside')!.item.changes).toMatchObject({ parent_id: 6 })
  // On the Unassigned zone: detach and go last.
  expect(planDrop(h, find(h, 'epic-1'), null, 'inside')!.item.changes).toEqual({ initiative_id: null, milestone_id: null, position: 1 })
  // Next to itself or into its own subtree does nothing.
  expect(planDrop(h, find(h, 'task-1'), find(h, 'task-1'), 'after')).toBeNull()
  expect(planDrop(h, find(h, 'task-1'), find(h, 'task-3'), 'after')).toBeNull()
})

test('moveDestinations lists every allowed parent as a path, with Unassigned last', () => {
  const h = sample()
  const epicDestinations = moveDestinations(h, find(h, 'epic-1'))
  expect(epicDestinations.map((d) => d.key)).toEqual(['milestone-1', 'initiative-1', 'milestone-2', 'initiative-2', UNASSIGNED_KEY])
  expect(epicDestinations[1].label).toBe('Initiative: M1 > I1')
  expect(epicDestinations[4]).toMatchObject({ label: 'Unassigned (no parent)', parent: null })
  // A task can go under epics, other tasks and milestones, but not under itself or its subtask.
  const taskKeys = moveDestinations(h, find(h, 'task-1')).map((d) => d.key)
  expect(taskKeys).toContain('epic-1')
  expect(taskKeys).toContain('task-2')
  expect(taskKeys).not.toContain('task-1')
  expect(taskKeys).not.toContain('task-3')
  expect(taskKeys).not.toContain('initiative-1')
})

test('moveSlots offers first and after each sibling of the same level, never the item itself', () => {
  const h = sample()
  expect(moveSlots(h, find(h, 'epic-2'), find(h, 'initiative-1'))).toEqual([
    { index: 0, label: 'First' },
    { index: 1, label: 'After "E1"' },
    { index: 2, label: 'After "E3"' },
  ])
  expect(moveSlots(h, find(h, 'epic-1'), find(h, 'initiative-2'))).toEqual([{ index: 0, label: 'First' }])
})

test("currentPlace says where an item is, in the dialog's terms", () => {
  const h = sample()
  expect(currentPlace(h, find(h, 'epic-3'))).toEqual({ destination: 'initiative-1', index: 2 })
  expect(currentPlace(h, find(h, 'task-9'))).toEqual({ destination: UNASSIGNED_KEY, index: 0 })
  expect(currentPlace(h, find(h, 'epic-9'))).toEqual({ destination: UNASSIGNED_KEY, index: 0 })
})
