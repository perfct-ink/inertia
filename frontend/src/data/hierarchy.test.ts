import type { Milestone, Initiative, Epic, Task } from '@/types'
import { buildHierarchy, reparentChanges, type HierarchyNode } from './hierarchy'

const milestone = (id: number) => ({ id, title: `M${id}`, tasks_count: 0, done_tasks_count: 0 }) as unknown as Milestone
const initiative = (id: number, milestone_id: number | null = null) =>
  ({ id, title: `I${id}`, milestone_id, tasks_count: 0, done_tasks_count: 0 }) as unknown as Initiative
const epic = (id: number, initiative_id: number | null = null, milestone_id: number | null = null) =>
  ({ id, title: `E${id}`, initiative_id, milestone_id, tasks_count: 0, done_tasks_count: 0 }) as unknown as Epic
const task = (id: number, opts: { epic_id?: number | null; milestone_id?: number | null; parent_id?: number | null; status?: Task['status'] } = {}) =>
  ({ id, title: `T${id}`, status: 'todo', epic_id: null, milestone_id: null, parent_id: null, ...opts }) as unknown as Task

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
  ({ key: `${kind}-${id}`, kind, id, title: '', tasksCount: 0, doneTasksCount: 0, children })

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
