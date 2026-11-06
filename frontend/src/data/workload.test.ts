import { personLoads } from './resource'
import { capacityOfWeek, hoursByWeek, planNotes, planWithTasks, workload } from './workload'
import type { ResourceAllocation, Task, WorkspaceMember } from '@/types'

const task = (extra: Partial<Task>) => ({ id: 1, status: 'todo', assignee_id: 7, estimate_hours: null, start_date: null, due_date: null, ...extra }) as unknown as Task
const member = (userId: number, name: string, capacity = 40) =>
  ({ id: userId + 100, user_id: userId, role: 'member', weekly_capacity_hours: capacity, user: { id: userId, name, email: `${name}@example.com` } }) as WorkspaceMember
const alloc = (id: number, userId: number, hours: number) =>
  ({ id, user_id: userId, folder_id: 10, hours_per_week: hours, start_date: null, end_date: null }) as ResourceAllocation

// 2026-10-19 and 2026-10-26 are Mondays.
const weeks = ['2026-10-19', '2026-10-26']

test('hours spread evenly over the weekdays, split across weeks', () => {
  // Mon 19 Oct to Tue 27 Oct: 7 weekdays (19-23, 26, 27), 14 hours = 2/day
  expect(hoursByWeek({ estimate_hours: 14, start_date: '2026-10-19', due_date: '2026-10-27' })).toEqual({ '2026-10-19': 10, '2026-10-26': 4 })
})

test('a task with only a due date lands on that day, a weekend-only task on its first day', () => {
  expect(hoursByWeek({ estimate_hours: 6, start_date: null, due_date: '2026-10-21' })).toEqual({ '2026-10-19': 6 })
  expect(hoursByWeek({ estimate_hours: 6, start_date: '2026-10-24', due_date: '2026-10-25' })).toEqual({ '2026-10-19': 6 })
})

test('tasks without an estimate or a due date contribute nothing', () => {
  expect(hoursByWeek({ estimate_hours: null, start_date: null, due_date: '2026-10-21' })).toEqual({})
  expect(hoursByWeek({ estimate_hours: 5, start_date: null, due_date: null })).toEqual({})
})

const tasks = [
  task({ id: 1, estimate_hours: 30, start_date: '2026-10-19', due_date: '2026-10-23' }),
  task({ id: 2, estimate_hours: 20, start_date: '2026-10-19', due_date: '2026-10-23' }),
  task({ id: 3, estimate_hours: 8, due_date: '2026-10-28', assignee_id: null }),
  task({ id: 4, estimate_hours: 99, due_date: '2026-10-20', status: 'done' }),
  task({ id: 5, estimate_hours: null, due_date: '2026-10-20' }),
  task({ id: 6, estimate_hours: 4, due_date: null }),
  task({ id: 7, estimate_hours: 30, start_date: '2026-10-19', due_date: '2026-10-23', assignee_id: 8 }),
]

describe('workload', () => {
  test('sums per person per week, skips done tasks and counts unplanned ones', () => {
    const result = workload(tasks, weeks, personLoads([member(7, 'Sam'), member(8, 'Kim')], [], weeks))
    expect(result.unplanned).toBe(2)
    expect(result.rows.map((r) => r.assigneeId)).toEqual([7, 8, null])
    expect(result.rows[0]).toMatchObject({ assigneeId: 7, hours: [50, 0], total: 50 })
    expect(result.rows[1]).toMatchObject({ assigneeId: 8, hours: [30, 0], total: 30 })
    expect(result.rows[2]).toMatchObject({ assigneeId: null, hours: [0, 8], total: 8 })
  })

  test('flags each person against their own capacity', () => {
    const result = workload(tasks, weeks, personLoads([member(7, 'Sam', 40), member(8, 'Kim', 20)], [], weeks))
    const [sam, kim] = result.rows
    expect(sam.capacity).toEqual([40, 40])
    expect(sam.over).toEqual([10, 0])
    expect(kim.capacity).toEqual([20, 20])
    expect(kim.over).toEqual([10, 0])
  })

  test('changing a person\'s capacity changes the warning', () => {
    const over = (capacity: number) => workload(tasks, weeks, personLoads([member(7, 'Sam', capacity)], [], weeks)).rows[0].over
    expect(over(40)).toEqual([10, 0])
    expect(over(50)).toEqual([0, 0])
    expect(over(0)).toEqual([50, 0])
  })

  test('has no capacity for unassigned tasks or someone no longer a member, so never flags them', () => {
    const result = workload(tasks, weeks, personLoads([member(7, 'Sam')], [], weeks))
    expect(result.rows[1]).toMatchObject({ assigneeId: 8, capacity: [null, null], over: [0, 0] })
    expect(result.rows[2]).toMatchObject({ assigneeId: null, capacity: [null, null], over: [0, 0] })
    expect(workload(tasks, weeks).rows.every((r) => r.over.every((o) => o === 0))).toBe(true)
  })
})

describe('planWithTasks', () => {
  const people = (capacity: number, allocated: number[] = []) =>
    personLoads([member(7, 'Sam', capacity)], allocated.map((hours, i) => alloc(i + 1, 7, hours)), weeks)
  const plan = (capacity: number, allocated: number[] = []) => {
    const loads = people(capacity, allocated)
    return planWithTasks(loads, workload(tasks, weeks, loads))[0]
  }

  test('puts task hours beside the allocated hours for each week', () => {
    const sam = plan(60, [30])
    expect(sam.hasTasks).toBe(true)
    expect(sam.weeks.map((w) => [w.allocated, w.tasks, w.capacity])).toEqual([[30, 50, 60], [30, 0, 60]])
    expect(sam.overWeeks).toBe(0)
  })

  test('is over capacity when only the tasks are', () => {
    const sam = plan(40, [10])
    expect(sam.weeks[0]).toMatchObject({ over: 0, taskOver: 10, worstOver: 10 })
    expect(sam.overWeeks).toBe(1)
  })

  test('is over capacity when only the allocations are', () => {
    const sam = plan(60, [70])
    expect(sam.weeks[0]).toMatchObject({ over: 10, taskOver: 0, worstOver: 10 })
    expect(sam.weeks[1]).toMatchObject({ over: 10, worstOver: 10 })
    expect(sam.overWeeks).toBe(2)
  })

  test('counts the worse of the two, not their sum (tasks are the work inside the allocations)', () => {
    // 45 allocated and 50 of tasks against 60: neither is over, though 95 > 60.
    expect(plan(60, [45]).overWeeks).toBe(0)
    const both = plan(40, [45]).weeks[0]
    expect(both).toMatchObject({ over: 5, taskOver: 10, worstOver: 10 })
  })

  test('someone without tasks has none, and week hours follow the capacity', () => {
    const loads = personLoads([member(9, 'Ada', 20)], [alloc(1, 9, 25)], weeks)
    const [ada] = planWithTasks(loads, workload(tasks, weeks, loads))
    expect(ada.hasTasks).toBe(false)
    expect(ada.weeks.map((w) => w.tasks)).toEqual([0, 0])
    expect(ada.weeks[0]).toMatchObject({ capacity: 20, taskOver: 0, worstOver: 5 })
  })

  test('capacityOfWeek is the hours free plus the hours allocated', () => {
    expect(capacityOfWeek({ free: -5, allocated: 45 })).toBe(40)
    expect(capacityOfWeek({ free: 10, allocated: 0.3 })).toBe(10.3)
  })

  test('planNotes says what is free or over and adds the tasks only when they are over', () => {
    expect(planNotes(plan(60, [30]).weeks[0])).toEqual([{ text: '30 h free', over: false }])
    expect(planNotes(plan(40, [10]).weeks[0])).toEqual([
      { text: '30 h free', over: false },
      { text: 'Tasks over by 10 h', over: true },
    ])
    expect(planNotes(plan(40, [45]).weeks[0])).toEqual([
      { text: 'Over by 5 h', over: true },
      { text: 'Tasks over by 10 h', over: true },
    ])
  })
})
