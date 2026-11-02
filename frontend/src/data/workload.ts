import { addDays, format, parseISO } from 'date-fns'
import type { Task } from '@/types'

export const DEFAULT_WEEKLY_CAPACITY = 40

// The Monday (yyyy-MM-dd) of the week a date falls in.
export function weekStart(date: string): string {
  const d = parseISO(date)
  const back = (d.getDay() + 6) % 7
  return format(addDays(d, -back), 'yyyy-MM-dd')
}

// `count` consecutive week starts beginning with the week of `from`.
export function weekRange(from: string, count: number): string[] {
  const first = parseISO(weekStart(from))
  return Array.from({ length: count }, (_, i) => format(addDays(first, 7 * i), 'yyyy-MM-dd'))
}

// A task's estimated hours spread evenly over the weekdays from its start date
// (or its due date, if it has none) to its due date, as hours per week start.
// A task that spans only a weekend puts everything on its first day. Tasks with
// no estimate or no due date contribute nothing.
export function hoursByWeek(task: Pick<Task, 'estimate_hours' | 'start_date' | 'due_date'>): Record<string, number> {
  if (!task.estimate_hours || !task.due_date) return {}
  const start = parseISO(task.start_date && task.start_date <= task.due_date ? task.start_date : task.due_date)
  const end = parseISO(task.due_date)
  const days: Date[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d)
  const workdays = days.filter((d) => d.getDay() !== 0 && d.getDay() !== 6)
  const spread = workdays.length > 0 ? workdays : [days[0]]
  const perDay = task.estimate_hours / spread.length
  const weeks: Record<string, number> = {}
  spread.forEach((d) => {
    const key = weekStart(format(d, 'yyyy-MM-dd'))
    weeks[key] = (weeks[key] ?? 0) + perDay
  })
  return weeks
}

export interface WorkloadRow {
  assigneeId: number | null
  // Hours in each requested week, in the same order as `weeks`.
  hours: number[]
  total: number
  // Hours over `capacity` in each week (0 when within it).
  over: number[]
}

export interface Workload {
  weeks: string[]
  rows: WorkloadRow[]
  // Open tasks that could not be counted: no estimate, or no due date.
  unplanned: number
}

const round = (n: number) => Math.round(n * 100) / 100

// Assigned effort per person per week for the open tasks. Done tasks are left
// out; tasks with nobody assigned form one "unassigned" row (last).
export function workload(tasks: Task[], weeks: string[], capacity: number = DEFAULT_WEEKLY_CAPACITY): Workload {
  const open = tasks.filter((t) => t.status !== 'done')
  const byAssignee = new Map<number | null, number[]>()
  let unplanned = 0
  open.forEach((task) => {
    const spread = hoursByWeek(task)
    if (Object.keys(spread).length === 0) { unplanned++; return }
    const key = task.assignee_id ?? null
    const row = byAssignee.get(key) ?? weeks.map(() => 0)
    weeks.forEach((w, i) => { row[i] += spread[w] ?? 0 })
    byAssignee.set(key, row)
  })
  const rows = [...byAssignee.entries()]
    .map(([assigneeId, hours]) => ({
      assigneeId,
      hours: hours.map(round),
      total: round(hours.reduce((a, b) => a + b, 0)),
      over: hours.map((h) => round(Math.max(0, h - capacity))),
    }))
    .sort((a, b) => (a.assigneeId === null ? 1 : b.assigneeId === null ? -1 : (a.assigneeId as number) - (b.assigneeId as number)))
  return { weeks, rows, unplanned }
}
