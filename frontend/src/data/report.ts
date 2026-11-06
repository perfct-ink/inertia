import type { Sprint, Task, TaskStatus, TaskStatusEvent } from '@/types'

// The agile reports (burndown, velocity, cumulative flow, planned vs. unplanned).
// All of the maths is here and works on plain data, so it can be tested without
// the screen: the screen only fetches tasks, sprints and the status history and
// draws what these functions return. Days are yyyy-MM-dd in the viewer's time
// zone; a day's status is the status at the end of that day.

// What a report counts: story points (tasks without points count as 0) or tasks.
export type ReportMeasure = 'points' | 'tasks'

export const REPORT_MEASURES: { value: ReportMeasure; label: string }[] = [
  { value: 'points', label: 'Story points' },
  { value: 'tasks', label: 'Tasks' },
]

export type ReportKind = 'burndown' | 'velocity' | 'flow' | 'scope'

export const REPORT_KINDS: { value: ReportKind; label: string }[] = [
  { value: 'burndown', label: 'Burndown' },
  { value: 'velocity', label: 'Velocity' },
  { value: 'flow', label: 'Cumulative flow' },
  { value: 'scope', label: 'Planned vs. unplanned' },
]

// The part of a task the reports read.
export type ReportTask = Pick<Task, 'id' | 'status' | 'sprint_id' | 'story_points' | 'actual_story_points' | 'created_at'>

// A sprint's id and dates, which is all the burndown needs of it.
export type ReportSprint = Pick<Sprint, 'id' | 'title' | 'status' | 'start_date' | 'end_date' | 'created_at'>

// No sprint or window is longer than this many days; a typo in a date can't draw thousands of points.
export const MAX_REPORT_DAYS = 366

// How many sprints the velocity and planned-vs-unplanned charts show, newest last.
export const REPORT_SPRINT_LIMIT = 8

// Velocity is the average of this many finished sprints.
export const VELOCITY_WINDOW = 3

// The windows of the cumulative flow chart, in days.
export const FLOW_RANGES: { value: number; label: string }[] = [
  { value: 14, label: 'Last 14 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
]

// Stacking order of the cumulative flow chart, bottom band first: finished work
// at the bottom so its band only ever grows.
export const FLOW_STACK: TaskStatus[] = ['done', 'in_review', 'in_progress', 'todo', 'backlog']

const pad = (n: number) => String(n).padStart(2, '0')

// yyyy-MM-dd of a date, in the viewer's time zone.
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const parts = (day: string): [number, number, number] => {
  const [y, m, d] = day.split('-').map(Number)
  return [y, m, d]
}

// The last millisecond of a day.
export function endOfDay(day: string): number {
  const [y, m, d] = parts(day)
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime()
}

// The day n days after `day` (n may be negative).
export function addDays(day: string, n: number): string {
  const [y, m, d] = parts(day)
  return dayKey(new Date(y, m - 1, d + n))
}

// Every day from `from` to `to`, inclusive; empty when `to` is before `from`.
export function daysBetween(from: string, to: string): string[] {
  const days: string[] = []
  for (let day = from; day <= to && days.length < MAX_REPORT_DAYS; day = addDays(day, 1)) days.push(day)
  return days
}

// ---- Status history ------------------------------------------------------

interface Step {
  time: number
  from: TaskStatus | null
  to: TaskStatus
}

export type StatusHistory = Map<number, Step[]>

// Each task's status changes, oldest first, keyed by task id.
export function groupChanges(changes: Pick<TaskStatusEvent, 'task_id' | 'from_status' | 'to_status' | 'created_at'>[]): StatusHistory {
  const history: StatusHistory = new Map()
  for (const change of changes) {
    const steps = history.get(change.task_id) ?? []
    steps.push({ time: Date.parse(change.created_at), from: change.from_status, to: change.to_status })
    history.set(change.task_id, steps)
  }
  history.forEach((steps) => steps.sort((a, b) => a.time - b.time))
  return history
}

// The status a task had at `time`, or null before it existed.
// - With changes up to then, the latest one decides.
// - With none yet, a task that changes later was in the status that change left
//   (a task older than the history); a task that never changed has always been
//   in its current status.
export function statusAt(task: Pick<ReportTask, 'id' | 'status' | 'created_at'>, history: StatusHistory, time: number): TaskStatus | null {
  if (task.created_at && time < Date.parse(task.created_at)) return null
  const steps = history.get(task.id) ?? []
  let status: TaskStatus | null = null
  for (const step of steps) {
    if (step.time > time) break
    status = step.to
  }
  if (status) return status
  if (steps.length === 0) return task.status
  return steps[0].from ?? steps[0].to
}

// ---- What a task is worth -------------------------------------------------

// The scope a task adds: 1, or its story points (0 when it has none).
export function workOf(task: Pick<ReportTask, 'story_points'>, measure: ReportMeasure): number {
  return measure === 'tasks' ? 1 : task.story_points ?? 0
}

// What finishing a task delivers: like workOf, but actual points win when they are known.
export function deliveredOf(task: Pick<ReportTask, 'story_points' | 'actual_story_points'>, measure: ReportMeasure): number {
  return measure === 'tasks' ? 1 : task.actual_story_points ?? task.story_points ?? 0
}

// "5 points", "1 task".
export function workLabel(amount: number, measure: ReportMeasure): string {
  const noun = measure === 'tasks' ? 'task' : 'point'
  return `${amount} ${amount === 1 ? noun : `${noun}s`}`
}

// How many of these tasks have no story points, which count as 0 in a points report.
export function unestimatedCount(tasks: Pick<ReportTask, 'story_points'>[]): number {
  return tasks.filter((task) => task.story_points == null).length
}

const round = (n: number) => Math.round(n * 100) / 100

// ---- Burndown -----------------------------------------------------------

export interface BurndownDay {
  date: string
  // Where the work should be if it burned down evenly.
  ideal: number
  // All the sprint's work that existed by the end of the day; null for days still to come.
  scope: number | null
  // Work not done by the end of the day; null for days still to come.
  remaining: number | null
}

export interface Burndown {
  days: BurndownDay[]
  // The work the sprint began with: tasks made by the end of its first day.
  planned: number
  // Tasks of the sprint with no story points (only matters when counting points).
  unestimated: number
}

// Work left in a sprint for each day from its start to its end, against the
// ideal line. The sprint's tasks are the ones in it now (the sprint of a task
// isn't kept as history), so a task moved in later shows from its creation.
// null when the sprint has no usable dates.
export function burndown(sprint: Pick<Sprint, 'id' | 'start_date' | 'end_date'>, tasks: ReportTask[], changes: TaskStatusEvent[], measure: ReportMeasure, today: string): Burndown | null {
  if (!sprint.start_date || !sprint.end_date || sprint.end_date < sprint.start_date) return null
  const inSprint = tasks.filter((task) => task.sprint_id === sprint.id)
  const history = groupChanges(changes)
  const sum = (time: number, open: boolean) =>
    inSprint.reduce((total, task) => {
      const status = statusAt(task, history, time)
      return status && (!open || status !== 'done') ? total + workOf(task, measure) : total
    }, 0)

  const dates = daysBetween(sprint.start_date, sprint.end_date)
  const planned = sum(endOfDay(sprint.start_date), false)
  const days = dates.map((date, i) => {
    const started = date <= today
    return {
      date,
      ideal: dates.length === 1 ? 0 : round((planned * (dates.length - 1 - i)) / (dates.length - 1)),
      scope: started ? sum(endOfDay(date), false) : null,
      remaining: started ? sum(endOfDay(date), true) : null,
    }
  })
  return { days, planned, unestimated: unestimatedCount(inSprint) }
}

// ---- Velocity -----------------------------------------------------------

export interface VelocityBar {
  sprintId: number
  title: string
  // Points (or tasks) of the sprint's finished tasks.
  completed: number
  // Finished tasks, whatever the measure.
  tasksDone: number
  // A sprint still running: its bar is a count so far, left out of the average.
  active: boolean
}

export interface Velocity {
  bars: VelocityBar[]
  // The average of the last few finished sprints, or null before one is done.
  average: number | null
}

// The sprints reports look at: running or finished ones (a planned sprint has
// done nothing yet), oldest first, the latest `limit`.
export function reportSprints<T extends Pick<Sprint, 'status' | 'start_date' | 'end_date' | 'created_at' | 'id'>>(sprints: T[], limit = REPORT_SPRINT_LIMIT): T[] {
  const key = (sprint: T) => sprint.start_date ?? sprint.end_date ?? sprint.created_at
  return sprints
    .filter((sprint) => sprint.status !== 'planned')
    .sort((a, b) => key(a).localeCompare(key(b)) || a.id - b.id)
    .slice(-limit)
}

// What each sprint got done. Unfinished tasks leave a sprint when it closes, so
// what is left in a finished sprint is what was delivered.
export function velocity(sprints: ReportSprint[], tasks: ReportTask[], measure: ReportMeasure, limit = REPORT_SPRINT_LIMIT): Velocity {
  const bars = reportSprints(sprints, limit).map((sprint) => {
    const done = tasks.filter((task) => task.sprint_id === sprint.id && task.status === 'done')
    return {
      sprintId: sprint.id,
      title: sprint.title,
      completed: round(done.reduce((total, task) => total + deliveredOf(task, measure), 0)),
      tasksDone: done.length,
      active: sprint.status === 'active',
    }
  })
  const finished = bars.filter((bar) => !bar.active).slice(-VELOCITY_WINDOW)
  const average = finished.length === 0 ? null : Math.round((finished.reduce((total, bar) => total + bar.completed, 0) / finished.length) * 10) / 10
  return { bars, average }
}

// ---- Planned vs. unplanned ---------------------------------------------

export interface ScopeRow {
  sprintId: number
  title: string
  planned: { total: number; done: number }
  unplanned: { total: number; done: number }
  // Share of the sprint's work that was added after it began, 0 to 100.
  unplannedPercent: number
}

// How much of each sprint was there when it began and how much was added after:
// a task made after the sprint's first day is unplanned. A task made earlier and
// moved in later counts as planned, as the date it joined isn't kept.
export function plannedVsUnplanned(sprints: ReportSprint[], tasks: ReportTask[], measure: ReportMeasure, limit = REPORT_SPRINT_LIMIT): ScopeRow[] {
  return reportSprints(sprints, limit).map((sprint) => {
    const startDay = sprint.start_date ?? dayKey(new Date(sprint.created_at))
    const row: ScopeRow = { sprintId: sprint.id, title: sprint.title, planned: { total: 0, done: 0 }, unplanned: { total: 0, done: 0 }, unplannedPercent: 0 }
    for (const task of tasks) {
      if (task.sprint_id !== sprint.id) continue
      const added = !!task.created_at && dayKey(new Date(task.created_at)) > startDay
      const bucket = added ? row.unplanned : row.planned
      const work = workOf(task, measure)
      bucket.total += work
      if (task.status === 'done') bucket.done += work
    }
    const all = row.planned.total + row.unplanned.total
    row.unplannedPercent = all === 0 ? 0 : Math.round((row.unplanned.total / all) * 100)
    return row
  })
}

// ---- Cumulative flow ----------------------------------------------------

export interface FlowDay {
  date: string
  counts: Record<TaskStatus, number>
}

// How much work was in each status at the end of each day from `from` to `to`
// (days still to come are left out). Tasks not yet made don't count.
export function cumulativeFlow(tasks: ReportTask[], changes: TaskStatusEvent[], from: string, to: string, measure: ReportMeasure, today: string): FlowDay[] {
  const history = groupChanges(changes)
  return daysBetween(from, to < today ? to : today).map((date) => {
    const counts: Record<TaskStatus, number> = { backlog: 0, todo: 0, in_progress: 0, in_review: 0, done: 0 }
    const time = endOfDay(date)
    for (const task of tasks) {
      const status = statusAt(task, history, time)
      if (status) counts[status] += workOf(task, measure)
    }
    return { date, counts }
  })
}

// The days a flow chart covers: the last `range` days up to today, or, for a
// sprint with dates, from its start to its end.
export function flowWindow(today: string, range: number, sprint?: Pick<Sprint, 'start_date' | 'end_date'> | null): { from: string; to: string } {
  if (sprint?.start_date && sprint.end_date && sprint.end_date >= sprint.start_date) return { from: sprint.start_date, to: sprint.end_date }
  return { from: addDays(today, 1 - range), to: today }
}

// Which tasks a flow chart covers: all of them, or one sprint's.
export function flowTasks(tasks: ReportTask[], sprintId: number | null): ReportTask[] {
  return sprintId === null ? tasks : tasks.filter((task) => task.sprint_id === sprintId)
}

// The sprint whose burndown opens first: the active one, else the latest that has begun.
export function defaultReportSprint<T extends Pick<Sprint, 'id' | 'status' | 'start_date' | 'end_date' | 'created_at'>>(sprints: T[]): T | undefined {
  const active = sprints.find((sprint) => sprint.status === 'active')
  if (active) return active
  const started = reportSprints(sprints, sprints.length)
  return started[started.length - 1]
}
