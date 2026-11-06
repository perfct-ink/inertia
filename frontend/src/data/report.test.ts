import type { TaskStatus, TaskStatusEvent } from '@/types'
import {
  addDays, burndown, cumulativeFlow, daysBetween, defaultReportSprint, deliveredOf, flowTasks, flowWindow, groupChanges, plannedVsUnplanned,
  readReportParams, reportSprints, statusAt, unestimatedCount, velocity, workLabel, workOf, type ReportSprint, type ReportTask,
} from './report'

// A moment on a day, in the viewer's time zone, as the API sends it.
const at = (day: string, hour = 12) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, hour).toISOString()
}

let nextId = 1
const task = (id: number, status: TaskStatus, extra: Partial<ReportTask> = {}): ReportTask =>
  ({ id, status, sprint_id: 1, story_points: null, actual_story_points: null, created_at: at('2026-10-01'), ...extra })
const change = (taskId: number, from: TaskStatus | null, to: TaskStatus, day: string, hour = 12): TaskStatusEvent =>
  ({ id: nextId++, task_id: taskId, from_status: from, to_status: to, created_at: at(day, hour) })
const sprint = (id: number, status: ReportSprint['status'], start: string | null, end: string | null, extra: Partial<ReportSprint> = {}): ReportSprint =>
  ({ id, title: `Sprint ${id}`, status, start_date: start, end_date: end, created_at: at('2026-10-01'), ...extra })

// One sprint, 2026-11-02 to 2026-11-06, looked at on 2026-11-04.
const tasks: ReportTask[] = [
  task(1, 'done', { story_points: 3, created_at: at('2026-10-30') }),
  task(2, 'in_progress', { story_points: 5, created_at: at('2026-10-31') }),
  task(3, 'done', { story_points: 2, created_at: at('2026-11-03', 9) }),
  task(4, 'todo', { created_at: at('2026-10-30') }),
]
const changes: TaskStatusEvent[] = [
  change(1, null, 'todo', '2026-10-30'),
  change(1, 'todo', 'done', '2026-11-03'),
  change(2, null, 'todo', '2026-10-31'),
  change(2, 'todo', 'in_progress', '2026-11-02', 10),
  change(3, null, 'todo', '2026-11-03', 9),
  change(3, 'todo', 'done', '2026-11-04', 15),
]
const week = sprint(1, 'active', '2026-11-02', '2026-11-06')

test('days run from one date to another, across months, and are capped', () => {
  expect(daysBetween('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'])
  expect(daysBetween('2026-11-02', '2026-11-01')).toEqual([])
  expect(daysBetween('2020-01-01', '2026-01-01')).toHaveLength(366)
  expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
})

test('a task has the status its latest change gave it, and none before it was made', () => {
  const history = groupChanges(changes)
  const end = (day: string) => new Date(`${day}T23:59:59`).getTime()
  expect(statusAt(tasks[0], history, end('2026-10-29'))).toBeNull()
  expect(statusAt(tasks[0], history, end('2026-10-31'))).toBe('todo')
  expect(statusAt(tasks[0], history, end('2026-11-03'))).toBe('done')
})

test('a task older than the history was in the status its first change left', () => {
  const old = task(9, 'done', { created_at: at('2026-09-01') })
  const history = groupChanges([change(9, 'in_progress', 'done', '2026-11-03')])
  expect(statusAt(old, history, Date.parse(at('2026-10-15')))).toBe('in_progress')
  expect(statusAt(old, history, Date.parse(at('2026-11-03', 13)))).toBe('done')
})

test('a task that never changed has always had its current status', () => {
  expect(statusAt(task(8, 'todo'), groupChanges([]), Date.parse(at('2026-10-15')))).toBe('todo')
})

test('work is points or tasks, and finished work counts the actual points when known', () => {
  expect(workOf(task(1, 'todo', { story_points: 3 }), 'points')).toBe(3)
  expect(workOf(task(1, 'todo'), 'points')).toBe(0)
  expect(workOf(task(1, 'todo', { story_points: 3 }), 'tasks')).toBe(1)
  expect(deliveredOf(task(1, 'done', { story_points: 3, actual_story_points: 5 }), 'points')).toBe(5)
  expect(deliveredOf(task(1, 'done', { story_points: 3 }), 'points')).toBe(3)
  expect(workLabel(1, 'points')).toBe('1 point')
  expect(workLabel(5, 'points')).toBe('5 points')
  expect(workLabel(2, 'tasks')).toBe('2 tasks')
  expect(unestimatedCount(tasks)).toBe(1)
})

test('the burndown counts the work left at the end of each day against the ideal line', () => {
  const result = burndown(week, tasks, changes, 'points', '2026-11-04')!
  expect(result.planned).toBe(8)
  expect(result.unestimated).toBe(1)
  expect(result.days.map((d) => d.date)).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'])
  expect(result.days.map((d) => d.ideal)).toEqual([8, 6, 4, 2, 0])
  // Task 3 is added on the 3rd and finished on the 4th; task 1 is finished on the 3rd.
  expect(result.days.map((d) => d.scope)).toEqual([8, 10, 10, null, null])
  expect(result.days.map((d) => d.remaining)).toEqual([8, 7, 5, null, null])
})

test('the burndown can count tasks instead of points', () => {
  const result = burndown(week, tasks, changes, 'tasks', '2026-11-04')!
  expect(result.planned).toBe(3)
  expect(result.days.map((d) => d.ideal)).toEqual([3, 2.25, 1.5, 0.75, 0])
  expect(result.days.map((d) => d.remaining)).toEqual([3, 3, 2, null, null])
})

test('the burndown ignores other sprints tasks and needs sensible dates', () => {
  const other = [...tasks, task(5, 'todo', { sprint_id: 2, story_points: 100 })]
  expect(burndown(week, other, changes, 'points', '2026-11-04')!.planned).toBe(8)
  expect(burndown(sprint(1, 'active', null, '2026-11-06'), tasks, changes, 'points', '2026-11-04')).toBeNull()
  expect(burndown(sprint(1, 'active', '2026-11-06', '2026-11-02'), tasks, changes, 'points', '2026-11-04')).toBeNull()
  expect(burndown(sprint(1, 'active', '2026-11-02', '2026-11-02'), tasks, changes, 'points', '2026-11-04')!.days[0].ideal).toBe(0)
})

test('the sprints reports cover are running or finished ones, oldest first, the latest few', () => {
  const sprints = [
    sprint(4, 'planned', '2026-11-16', '2026-11-20'),
    sprint(3, 'active', '2026-11-02', '2026-11-06'),
    sprint(1, 'done', '2026-10-05', '2026-10-09'),
    sprint(2, 'done', '2026-10-19', '2026-10-23'),
  ]
  expect(reportSprints(sprints).map((s) => s.id)).toEqual([1, 2, 3])
  expect(reportSprints(sprints, 2).map((s) => s.id)).toEqual([2, 3])
})

test('velocity is what each sprint finished, averaged over finished sprints only', () => {
  const sprints = [sprint(1, 'done', '2026-10-05', '2026-10-09'), sprint(2, 'done', '2026-10-19', '2026-10-23'), sprint(3, 'active', '2026-11-02', '2026-11-06'), sprint(4, 'planned', null, null)]
  const delivered = [
    task(1, 'done', { sprint_id: 1, story_points: 3, actual_story_points: 5 }),
    task(2, 'done', { sprint_id: 1, story_points: 2 }),
    task(3, 'todo', { sprint_id: 1, story_points: 8 }),
    task(4, 'done', { sprint_id: 2, story_points: 8 }),
    task(5, 'done', { sprint_id: 3, story_points: 1 }),
  ]
  const points = velocity(sprints, delivered, 'points')
  expect(points.bars).toEqual([
    { sprintId: 1, title: 'Sprint 1', completed: 7, tasksDone: 2, active: false },
    { sprintId: 2, title: 'Sprint 2', completed: 8, tasksDone: 1, active: false },
    { sprintId: 3, title: 'Sprint 3', completed: 1, tasksDone: 1, active: true },
  ])
  expect(points.average).toBe(7.5)
  expect(velocity(sprints, delivered, 'tasks').average).toBe(1.5)
  expect(velocity(sprints, delivered, 'points', 2).bars.map((b) => b.sprintId)).toEqual([2, 3])
  expect(velocity([sprint(3, 'active', '2026-11-02', null)], delivered, 'points').average).toBeNull()
  expect(velocity([], [], 'points')).toEqual({ bars: [], average: null })
})

test('work made after a sprint began is unplanned', () => {
  const running = sprint(3, 'active', '2026-11-02', '2026-11-06')
  const rows = plannedVsUnplanned([running], [
    task(1, 'done', { sprint_id: 3, story_points: 3, created_at: at('2026-10-30') }),
    task(2, 'todo', { sprint_id: 3, story_points: 2, created_at: at('2026-11-03') }),
    task(3, 'done', { sprint_id: 3, story_points: 1, created_at: undefined }),
    task(4, 'todo', { sprint_id: 4, story_points: 9, created_at: at('2026-11-03') }),
  ], 'points')
  expect(rows).toEqual([{ sprintId: 3, title: 'Sprint 3', planned: { total: 4, done: 4 }, unplanned: { total: 2, done: 0 }, unplannedPercent: 33 }])
  expect(plannedVsUnplanned([running], [], 'tasks')[0].unplannedPercent).toBe(0)
})

test('work made on the first day of a sprint is planned', () => {
  const rows = plannedVsUnplanned([sprint(3, 'done', '2026-11-02', '2026-11-06')], [task(1, 'todo', { sprint_id: 3, created_at: at('2026-11-02', 20) })], 'tasks')
  expect(rows[0].planned.total).toBe(1)
  expect(rows[0].unplanned.total).toBe(0)
})

test('cumulative flow counts the work in each status at the end of each day up to today', () => {
  const days = cumulativeFlow(tasks, changes, '2026-11-02', '2026-11-06', 'points', '2026-11-04')
  expect(days.map((d) => d.date)).toEqual(['2026-11-02', '2026-11-03', '2026-11-04'])
  expect(days[0].counts).toEqual({ backlog: 0, todo: 3, in_progress: 5, in_review: 0, done: 0 })
  expect(days[2].counts).toEqual({ backlog: 0, todo: 0, in_progress: 5, in_review: 0, done: 5 })
  const byTask = cumulativeFlow(tasks, changes, '2026-11-02', '2026-11-04', 'tasks', '2026-11-04')
  expect(byTask[1].counts).toEqual({ backlog: 0, todo: 2, in_progress: 1, in_review: 0, done: 1 })
  expect(byTask[0].counts.todo + byTask[0].counts.in_progress).toBe(3)
})

test('the flow window is the last days to today, or a sprints own dates', () => {
  expect(flowWindow('2026-11-04', 14)).toEqual({ from: '2026-10-22', to: '2026-11-04' })
  expect(flowWindow('2026-11-04', 14, week)).toEqual({ from: '2026-11-02', to: '2026-11-06' })
  expect(flowWindow('2026-11-04', 7, sprint(1, 'done', null, null))).toEqual({ from: '2026-10-29', to: '2026-11-04' })
  expect(flowTasks(tasks, null)).toHaveLength(4)
  expect(flowTasks([...tasks, task(5, 'todo', { sprint_id: 2 })], 2).map((t) => t.id)).toEqual([5])
})

test('the sprint a report opens on is the active one, else the latest that began', () => {
  const done = sprint(6, 'done', '2026-10-05', '2026-10-09')
  const later = sprint(2, 'done', '2026-10-19', '2026-10-23')
  const planned = sprint(5, 'planned', '2026-12-01', '2026-12-05')
  expect(defaultReportSprint([done, later, planned])?.id).toBe(2)
  expect(defaultReportSprint([done, week, later])?.id).toBe(1)
  expect(defaultReportSprint([planned])).toBeUndefined()
  expect(defaultReportSprint([])).toBeUndefined()
})

describe('readReportParams', () => {
  const read = (query: string) => readReportParams(new URLSearchParams(query))

  test('opens the burndown in story points over the last 30 days by default', () => {
    expect(read('')).toEqual({ kind: 'burndown', measure: 'points', sprintId: null, range: 30 })
  })

  test('reads the report, measure, sprint and range', () => {
    expect(read('report=flow&measure=tasks&sprint=7&range=90')).toEqual({ kind: 'flow', measure: 'tasks', sprintId: 7, range: 90 })
    expect(read('report=velocity').kind).toBe('velocity')
    expect(read('report=scope').kind).toBe('scope')
  })

  test('anything it does not recognise falls back to the default', () => {
    expect(read('report=pie&measure=hours&sprint=abc&range=45')).toEqual({ kind: 'burndown', measure: 'points', sprintId: null, range: 30 })
    expect(read('sprint=0').sprintId).toBeNull()
    expect(read('sprint=-3').sprintId).toBeNull()
    expect(read('sprint=2.5').sprintId).toBeNull()
  })
})
