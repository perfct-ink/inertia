import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { DependencyKind, DependencyMode, TaskDependency } from '@/types'

export const DEPENDENCY_KINDS: DependencyKind[] = ['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish']

export const DEPENDENCY_LABEL: Record<DependencyKind, string> = {
  finish_to_start: 'Finish to start',
  start_to_start: 'Start to start',
  finish_to_finish: 'Finish to finish',
  start_to_finish: 'Start to finish',
}

export type BarSide = 'start' | 'end'

// Which end of each bar a link connects: finish_to_start runs from the
// predecessor's end to the successor's start, and so on.
export function linkSides(kind: DependencyKind): { from: BarSide; to: BarSide } {
  const [from, to] = kind.split('_to_') as ['start' | 'finish', 'start' | 'finish']
  return { from: from === 'start' ? 'start' : 'end', to: to === 'start' ? 'start' : 'end' }
}

// The reverse of linkSides: the kind for a link drawn from one bar side to another.
export function kindFromSides(from: BarSide, to: BarSide): DependencyKind {
  return `${from === 'start' ? 'start' : 'finish'}_to_${to === 'start' ? 'start' : 'finish'}` as DependencyKind
}

type DatedTask = { id: number; start_date?: string | null; due_date: string | null }

// The chain of tasks that drives the latest finish date (PM-15). Starting
// from the task that finishes last, step back to whichever predecessor's
// linked date (its finish, or its start for start_to_* links) is latest,
// until a task has no dated predecessor. Uses the dates as entered, so it
// shows what is driving the plan today rather than re-scheduling anything.
// Empty when the last task has no predecessors: one task is not a path.
export function drivingPath(tasks: DatedTask[], dependencies: TaskDependency[]): Set<number> {
  const dated = new Map(tasks.filter((t) => t.due_date).map((t) => [t.id, t]))
  if (dated.size === 0 || dependencies.length === 0) return new Set()
  const last = [...dated.values()].reduce((a, b) => ((b.due_date as string) > (a.due_date as string) ? b : a))

  const path = new Set<number>([last.id])
  let current = last
  for (;;) {
    let driver: DatedTask | undefined
    let driverDate = ''
    dependencies.forEach((dep) => {
      if (dep.successor_id !== current.id || path.has(dep.predecessor_id)) return
      const pred = dated.get(dep.predecessor_id)
      if (!pred) return
      const date = linkSides(dep.kind).from === 'end' ? (pred.due_date as string) : (pred.start_date ?? (pred.due_date as string))
      if (date > driverDate) {
        driver = pred
        driverDate = date
      }
    })
    if (!driver) break
    path.add(driver.id)
    current = driver
  }
  return path.size > 1 ? path : new Set()
}

export const DEPENDENCY_MODES: DependencyMode[] = ['none', 'strict', 'flexible']

export const DEPENDENCY_MODE_LABEL: Record<DependencyMode, string> = {
  none: 'Ignore dependencies',
  strict: 'Block invalid dates',
  flexible: 'Shift dependent tasks',
}

type SchedTask = { id: number; title?: string; start_date?: string | null; due_date: string | null }
export type DateUpdate = { id: number; start_date: string; due_date: string }

// What moving a task does under each mode (PM-14):
// none     - just the moved task.
// strict   - refuse when any link touching it would end up broken.
// flexible - the moved task goes where it was put and everything that waits
//            on it (transitively) is pushed later, keeping its length, only
//            as far as needed to satisfy its link.
// A link is satisfied when the successor's linked side is on or after the
// predecessor's (finish-to-start allows the same day). Undated tasks are
// ignored; a task with only a due date counts as starting that day. The server
// forbids dependency loops, and `guard` stops a bad one anyway.
export function planReschedule(
  tasks: SchedTask[],
  dependencies: TaskDependency[],
  taskId: number,
  startDate: string,
  dueDate: string,
  mode: DependencyMode,
): { updates: DateUpdate[] } | { error: string } {
  const dates = new Map<number, { start: string; end: string }>()
  tasks.forEach((t) => {
    if (t.due_date) dates.set(t.id, { start: t.start_date ?? t.due_date, end: t.due_date })
  })
  const titles = new Map(tasks.map((t) => [t.id, t.title ?? `#${t.id}`]))
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd')
  const next = new Map(dates)
  next.set(taskId, { start: startDate, end: dueDate })
  const moved = new Map<number, { start: string; end: string }>([[taskId, { start: startDate, end: dueDate }]])

  // Days the successor must move later for this link to hold (<= 0: already fine).
  const shortfall = (dep: TaskDependency) => {
    const pred = next.get(dep.predecessor_id)
    const succ = next.get(dep.successor_id)
    if (!pred || !succ) return 0
    const sides = linkSides(dep.kind)
    const from = sides.from === 'start' ? pred.start : pred.end
    const to = sides.to === 'start' ? succ.start : succ.end
    return differenceInCalendarDays(parseISO(from), parseISO(to))
  }

  if (mode === 'strict') {
    const broken = dependencies.find((d) => (d.predecessor_id === taskId || d.successor_id === taskId) && shortfall(d) > 0)
    if (broken) {
      return { error: `That would break the dependency of "${titles.get(broken.successor_id)}" on "${titles.get(broken.predecessor_id)}".` }
    }
  }

  if (mode === 'flexible') {
    const queue = [taskId]
    let guard = dependencies.length * tasks.length + 1
    while (queue.length > 0 && guard-- > 0) {
      const current = queue.shift() as number
      dependencies.filter((d) => d.predecessor_id === current).forEach((d) => {
        const late = shortfall(d)
        const succ = next.get(d.successor_id)
        if (late <= 0 || !succ) return
        const shifted = { start: fmt(addDays(parseISO(succ.start), late)), end: fmt(addDays(parseISO(succ.end), late)) }
        next.set(d.successor_id, shifted)
        moved.set(d.successor_id, shifted)
        queue.push(d.successor_id)
      })
    }
  }

  return { updates: [...moved].map(([id, r]) => ({ id, start_date: r.start, due_date: r.end })) }
}
