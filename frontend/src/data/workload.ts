import { addDays, format, parseISO } from 'date-fns'
import { formatHours, weekNote, weekStart } from '@/data/resource'
import type { PersonLoad, WeekLoad } from '@/data/resource'
import type { Task } from '@/types'

// Workload: the effort of each person's open tasks per week, set against their
// own capacity. Capacity and the week helpers come from `data/resource.ts`
// (Resource management), so changing someone's capacity there changes the
// warnings here. Pure functions only.

const round = (n: number) => Math.round(n * 100) / 100

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

// What a person can work in a week, as `personLoads` worked it out: the hours
// still free plus the hours allocated. Read from there rather than from the
// member, so whatever lowers a week's capacity there is counted here too.
export function capacityOfWeek(week: Pick<WeekLoad, 'free' | 'allocated'>): number {
  return round(week.free + week.allocated)
}

export interface WorkloadRow {
  assigneeId: number | null
  // Hours in each requested week, in the same order as `weeks`.
  hours: number[]
  total: number
  // The assignee's capacity in each week; null where there is none to compare
  // with (the "unassigned" row, or someone who has left the Space).
  capacity: (number | null)[]
  // Hours over that capacity in each week (0 when within it or when it is null).
  over: number[]
}

export interface Workload {
  weeks: string[]
  rows: WorkloadRow[]
  // Open tasks that could not be counted: no estimate, or no due date.
  unplanned: number
}

// Assigned effort per person per week for the open tasks, against the capacity
// of the matching `people` (from `personLoads` over the same `weeks`). Done
// tasks are left out; tasks with nobody assigned form one "unassigned" row
// (last), which has no capacity and is never flagged.
export function workload(tasks: Task[], weeks: string[], people: PersonLoad[] = []): Workload {
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
    .map(([assigneeId, hours]): WorkloadRow => {
      const person = people.find((p) => p.userId === assigneeId)
      const capacity = weeks.map((w) => {
        const week = person?.weeks.find((l) => l.week === w)
        return week ? capacityOfWeek(week) : null
      })
      return {
        assigneeId,
        hours: hours.map(round),
        total: round(hours.reduce((a, b) => a + b, 0)),
        capacity,
        over: hours.map((h, i) => (capacity[i] === null ? 0 : round(Math.max(0, h - (capacity[i] as number))))),
      }
    })
    .sort((a, b) => (a.assigneeId === null ? 1 : b.assigneeId === null ? -1 : (a.assigneeId as number) - (b.assigneeId as number)))
  return { weeks, rows, unplanned }
}

// ── Allocations and tasks together ───────────────────────────────────────────

export interface WeekPlan extends WeekLoad {
  // Hours the person can work this week.
  capacity: number
  // Hours of their open tasks scheduled in the week.
  tasks: number
  // Task hours above `capacity` (0 when within it).
  taskOver: number
  // The worse of the two overruns: allocated hours over (`over`) and task hours over.
  worstOver: number
}

export interface PersonPlan extends PersonLoad {
  weeks: WeekPlan[]
  // Whether they have any task hours in the visible weeks.
  hasTasks: boolean
  // Unlike `PersonLoad`, counts a week over capacity by allocations *or* tasks.
  overWeeks: number
}

// Puts each person's task effort (from `workload` over the same weeks) beside
// their allocated hours. A week is over capacity when either exceeds it, not
// when their sum does: the tasks are the work inside the allocations, so adding
// the two would count the same hours twice.
export function planWithTasks(people: PersonLoad[], work: Workload): PersonPlan[] {
  return people.map((person) => {
    const row = work.rows.find((r) => r.assigneeId === person.userId)
    const weeks = person.weeks.map((week): WeekPlan => {
      const i = work.weeks.indexOf(week.week)
      const counted = row !== undefined && i >= 0
      const taskOver = counted ? row.over[i] : 0
      return {
        ...week,
        capacity: capacityOfWeek(week),
        tasks: counted ? row.hours[i] : 0,
        taskOver,
        worstOver: Math.max(week.over, taskOver),
      }
    })
    return { ...person, weeks, hasTasks: weeks.some((w) => w.tasks > 0), overWeeks: weeks.filter((w) => w.worstOver > 0).length }
  })
}

// What to say about a week under its hours: the allocation note ("10 h free",
// "Over by 10 h") and, when the tasks alone are over, how far. `over` marks the
// notes that are warnings.
export function planNotes(week: WeekPlan): { text: string; over: boolean }[] {
  const notes = [{ text: weekNote(week), over: week.over > 0 }]
  if (week.taskOver > 0) notes.push({ text: `Tasks over by ${formatHours(week.taskOver)} h`, over: true })
  return notes
}
