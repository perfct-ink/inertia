import type { Task } from '@/types'
import {
  UNPLANNED, addPatch, epicPlan, epicTasks, estimateRollup, groupByStatus, isPlanTarget, patchTasks, planMove, settlePatch, unplannedTasks,
} from './epic'

let nextId = 1
const task = (opts: Partial<Task> = {}): Task => ({
  id: nextId++, title: `Task ${nextId}`, description: null, status: 'todo', start_date: null, due_date: null, position: 0,
  document_id: 1, assignee_id: null, epic_id: null, parent_id: null, folder_id: null, ...opts,
})

describe('epicTasks and unplannedTasks', () => {
  const tasks = [
    task({ id: 1, title: 'In the epic', epic_id: 5 }),
    task({ id: 2, title: 'In another epic', epic_id: 6 }),
    task({ id: 3, title: 'Loose todo', status: 'todo' }),
    task({ id: 4, title: 'Loose backlog', status: 'backlog' }),
    task({ id: 5, title: 'Loose done', status: 'done' }),
    task({ id: 6, title: 'Loose subtask', parent_id: 3 }),
  ]

  test('epicTasks keeps only the epic', () => {
    expect(epicTasks(tasks, 5).map((t) => t.id)).toEqual([1])
  })

  test('unplannedTasks lists open top-level tasks with no epic, backlog first', () => {
    expect(unplannedTasks(tasks).map((t) => t.id)).toEqual([4, 3])
  })

  test('unplannedTasks filters by title regardless of case', () => {
    expect(unplannedTasks(tasks, '  LOOSE TODO ').map((t) => t.id)).toEqual([3])
    expect(unplannedTasks(tasks, 'nothing')).toEqual([])
  })
})

test('groupByStatus has a group for every status', () => {
  const groups = groupByStatus([task({ status: 'done' }), task({ status: 'done' }), task({ status: 'in_review' })])
  expect(Object.keys(groups)).toEqual(['backlog', 'todo', 'in_progress', 'in_review', 'done'])
  expect(groups.done).toHaveLength(2)
  expect(groups.in_review).toHaveLength(1)
  expect(groups.backlog).toEqual([])
})

test('isPlanTarget accepts statuses and the backlog pane only', () => {
  expect(isPlanTarget('todo')).toBe(true)
  expect(isPlanTarget(UNPLANNED)).toBe(true)
  expect(isPlanTarget('task-3')).toBe(false)
  expect(isPlanTarget(3)).toBe(false)
})

describe('planMove', () => {
  test('dropping an unplanned task on a section puts it in the epic with that status', () => {
    expect(planMove(task({ status: 'backlog' }), 5, 'todo')).toEqual({ epic_id: 5, status: 'todo' })
  })

  test('the status is left alone when the section matches it', () => {
    expect(planMove(task({ status: 'todo' }), 5, 'todo')).toEqual({ epic_id: 5 })
  })

  test('a task already in the epic only changes status', () => {
    expect(planMove(task({ epic_id: 5, status: 'todo' }), 5, 'done')).toEqual({ status: 'done' })
    expect(planMove(task({ epic_id: 5, status: 'todo' }), 5, 'todo')).toBeNull()
  })

  test('dropping on the backlog pane takes a task out of the epic', () => {
    expect(planMove(task({ epic_id: 5 }), 5, UNPLANNED)).toEqual({ epic_id: null })
    expect(planMove(task({ epic_id: null }), 5, UNPLANNED)).toBeNull()
  })

  test('a task of another epic is not moved here', () => {
    expect(planMove(task({ epic_id: 6 }), 5, 'todo')).toBeNull()
    expect(planMove(task({ epic_id: 6 }), 5, UNPLANNED)).toBeNull()
  })
})

describe('patches', () => {
  const a = task({ id: 10, title: 'A', status: 'todo' })
  const b = task({ id: 11, title: 'B', status: 'todo' })

  test('patchTasks lays pending edits over the server tasks', () => {
    const patched = patchTasks([a, b], { 10: { status: 'done', epic_id: 5 } })
    expect(patched[0]).toMatchObject({ id: 10, status: 'done', epic_id: 5 })
    expect(patched[1]).toBe(b)
  })

  test('addPatch merges into an earlier pending edit of the same task', () => {
    const patches = addPatch(addPatch({}, 10, { status: 'done' }), 10, { due_date: '2026-11-05' })
    expect(patches).toEqual({ 10: { status: 'done', due_date: '2026-11-05' } })
  })

  test('settlePatch drops a saved edit but keeps one that was edited again meanwhile', () => {
    const pending = { 10: { status: 'done' as const, due_date: '2026-11-05' } }
    expect(settlePatch(pending, 10, { status: 'done' })).toEqual({ 10: { due_date: '2026-11-05' } })
    expect(settlePatch(pending, 10, { status: 'todo' })).toEqual(pending)
    expect(settlePatch({ 10: { status: 'done' as const } }, 10, { status: 'done' })).toEqual({})
    expect(settlePatch({}, 10, { status: 'done' })).toEqual({})
  })
})

describe('epicPlan', () => {
  const epic = { start_date: '2026-11-01', target_date: '2026-11-30' }

  test('an epic with no tasks has an empty rollup', () => {
    expect(epicPlan(epic, [], '2026-11-10')).toMatchObject({
      total: 0, done: 0, percent: 0, scheduled: 0, unscheduled: 0, overdue: 0, firstDate: null, lastDate: null,
      startsBeforeEpic: false, endsAfterEpic: false,
      points: { total: 0, done: 0, tasks: 0 }, hours: { total: 0, done: 0, tasks: 0 },
    })
  })

  test('counts, percent and status breakdown', () => {
    const plan = epicPlan(epic, [
      task({ status: 'done' }), task({ status: 'done' }), task({ status: 'in_progress' }), task({ status: 'backlog' }),
    ], '2026-11-10')
    expect(plan.total).toBe(4)
    expect(plan.done).toBe(2)
    expect(plan.percent).toBe(50)
    expect(plan.byStatus).toEqual({ backlog: 1, todo: 0, in_progress: 1, in_review: 0, done: 2 })
  })

  test('scheduled, overdue and the date span of the tasks', () => {
    const plan = epicPlan(epic, [
      task({ start_date: '2026-11-02', due_date: '2026-11-05' }),
      task({ due_date: '2026-11-08', status: 'done' }),
      task({ due_date: '2026-11-09', status: 'todo' }),
      task({ status: 'todo' }),
    ], '2026-11-10')
    expect(plan.scheduled).toBe(3)
    expect(plan.unscheduled).toBe(1)
    // The first and third are past due and open; the second is past due but done.
    expect(plan.overdue).toBe(2)
    expect(plan.firstDate).toBe('2026-11-02')
    expect(plan.lastDate).toBe('2026-11-09')
    expect(plan.startsBeforeEpic).toBe(false)
    expect(plan.endsAfterEpic).toBe(false)
  })

  test('flags tasks that reach outside the epic dates', () => {
    const plan = epicPlan(epic, [task({ start_date: '2026-10-28', due_date: '2026-12-03' })], '2026-11-10')
    expect(plan.startsBeforeEpic).toBe(true)
    expect(plan.endsAfterEpic).toBe(true)
  })

  test('an epic without dates is never flagged', () => {
    const plan = epicPlan({ start_date: null, target_date: null }, [task({ due_date: '2030-01-01' })], '2026-11-10')
    expect(plan.startsBeforeEpic).toBe(false)
    expect(plan.endsAfterEpic).toBe(false)
  })

  describe('estimate totals', () => {
    const noDates = { start_date: null, target_date: null }

    test('sums story points and hours, and the part that is done', () => {
      const plan = epicPlan(noDates, [
        task({ story_points: 8, estimate_hours: 6.5, status: 'done' }),
        task({ story_points: 5, estimate_hours: 0.1, status: 'done' }),
        task({ story_points: 8, estimate_hours: 0.2, status: 'in_progress' }),
        task({ status: 'todo' }),
      ], '2026-11-10')
      expect(plan.points).toEqual({ total: 21, done: 13, tasks: 3 })
      // 0.1 + 0.2 stays 0.3, not 0.30000000000000004.
      expect(plan.hours).toEqual({ total: 6.8, done: 6.6, tasks: 3 })
    })

    test('a done task counts its estimate, not its actual points', () => {
      const plan = epicPlan(noDates, [task({ status: 'done', story_points: 3, actual_story_points: 8 })], '2026-11-10')
      expect(plan.points).toEqual({ total: 3, done: 3, tasks: 1 })
    })

    test('tasks without an estimate count for nothing, and a lone zero is still an estimate', () => {
      const plan = epicPlan(noDates, [task({ story_points: null, estimate_hours: null }), task({ story_points: 0, status: 'done' })], '2026-11-10')
      expect(plan.points).toEqual({ total: 0, done: 0, tasks: 1 })
      expect(plan.hours.tasks).toBe(0)
    })
  })
})

test('estimateRollup words the totals and hides a unit nobody estimated', () => {
  expect(estimateRollup({ total: 21, done: 13, tasks: 3 }, 'point')).toBe('13 of 21 points done')
  expect(estimateRollup({ total: 1, done: 0, tasks: 1 }, 'point')).toBe('0 of 1 point done')
  expect(estimateRollup({ total: 12, done: 6.5, tasks: 2 }, 'hour')).toBe('6.5 of 12 hours done')
  expect(estimateRollup({ total: 0, done: 0, tasks: 0 }, 'point')).toBeNull()
})
