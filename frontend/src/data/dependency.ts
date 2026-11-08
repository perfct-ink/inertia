import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { DependencyKind, DependencyMode, Folder, Task, TaskDependency, TaskLink } from '@/types'
import { projectOf } from './folder'
import { taskFolderId } from './task'

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

type Span = { start: string; end: string }

const sideOf = (span: Span, side: BarSide) => (side === 'start' ? span.start : span.end)

// The days a task covers: from its start (its due date when it has no start)
// to its due date. Null when it has no due date, as undated tasks are ignored.
export function spanOf(task: { start_date?: string | null; due_date: string | null } | undefined): Span | null {
  return task?.due_date ? { start: task.start_date ?? task.due_date, end: task.due_date } : null
}

// Days the successor must move later for a link to hold (negative: it has that
// many days to spare). A link holds when the successor's linked side is on or
// after the predecessor's; finish to start allows the same day.
export function linkDaysLate(kind: DependencyKind, predecessor: Span, successor: Span): number {
  const sides = linkSides(kind)
  return differenceInCalendarDays(parseISO(sideOf(predecessor, sides.from)), parseISO(sideOf(successor, sides.to)))
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
//            on it (transitively) follows: pushed later, keeping its length,
//            only as far as needed to satisfy its link; or pulled earlier by
//            the same amount, but only when it was sitting exactly on its
//            link before the move (a deliberate gap is left alone) and never
//            past what its other links allow.
// A link is satisfied when the successor's linked side is on or after the
// predecessor's (finish-to-start allows the same day). Undated tasks are
// ignored; a task with only a due date counts as starting that day. The server
// forbids dependency loops, and `guard` stops a bad one anyway.
// The server applies the same rules when a task is saved
// (backend/app/services/scheduling/dependency_planner.rb): change both together.
export function planReschedule(
  tasks: SchedTask[],
  dependencies: TaskDependency[],
  taskId: number,
  startDate: string,
  dueDate: string,
  mode: DependencyMode,
): { updates: DateUpdate[] } | { error: string } {
  const dates = new Map<number, Span>()
  tasks.forEach((t) => {
    const span = spanOf(t)
    if (span) dates.set(t.id, span)
  })
  const titles = new Map(tasks.map((t) => [t.id, t.title ?? `#${t.id}`]))
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd')
  const next = new Map(dates)
  next.set(taskId, { start: startDate, end: dueDate })
  const moved = new Map<number, Span>([[taskId, { start: startDate, end: dueDate }]])

  // Days the successor must move later for this link to hold. Null when either
  // task is undated.
  const daysLate = (dep: TaskDependency) => {
    const pred = next.get(dep.predecessor_id)
    const succ = next.get(dep.successor_id)
    return pred && succ ? linkDaysLate(dep.kind, pred, succ) : null
  }

  // Days (negative) the successor follows its predecessor earlier: only for a
  // link that was exactly tight before the move whose predecessor side has now
  // moved earlier, and not further than the successor's other links allow.
  const daysToPull = (dep: TaskDependency) => {
    const predWas = dates.get(dep.predecessor_id)
    const succWas = dates.get(dep.successor_id)
    const predNow = next.get(dep.predecessor_id)
    if (!predWas || !succWas || !predNow) return 0
    const sides = linkSides(dep.kind)
    const from = sideOf(predWas, sides.from)
    if (sideOf(succWas, sides.to) !== from || sideOf(predNow, sides.from) >= from) return 0
    const floor = Math.max(...dependencies
      .filter((d) => d.successor_id === dep.successor_id)
      .map(daysLate)
      .filter((days): days is number => days !== null))
    return floor < 0 ? floor : 0
  }

  if (mode === 'strict') {
    const broken = dependencies.find((d) => (d.predecessor_id === taskId || d.successor_id === taskId) && (daysLate(d) ?? 0) > 0)
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
        const succ = next.get(d.successor_id)
        const late = daysLate(d) ?? 0
        const shift = late > 0 ? late : daysToPull(d)
        if (!succ || shift === 0) return
        const shifted = { start: fmt(addDays(parseISO(succ.start), shift)), end: fmt(addDays(parseISO(succ.end), shift)) }
        next.set(d.successor_id, shifted)
        moved.set(d.successor_id, shifted)
        queue.push(d.successor_id)
      })
    }
  }

  return { updates: [...moved].map(([id, r]) => ({ id, start_date: r.start, due_date: r.end })) }
}

// Splits links by how they relate to one folder's tasks: `internal` has both
// ends in it (drawn on its chart), `external` has exactly one end in it (the
// other end is a task in another project). Links with neither end are dropped.
export function splitDependencies(dependencies: TaskDependency[], taskIds: { has(id: number): boolean }) {
  const internal: TaskDependency[] = []
  const external: TaskDependency[] = []
  dependencies.forEach((d) => {
    const ends = Number(taskIds.has(d.predecessor_id)) + Number(taskIds.has(d.successor_id))
    if (ends === 2) internal.push(d)
    else if (ends === 1) external.push(d)
  })
  return { internal, external }
}

// What the editor shows about the end of a link that is in another project.
export interface ExternalEnd {
  // The task in the other project, as the server sent it with the link.
  task: TaskLink | undefined
  // Whether the task on the chart waits on it (it is the predecessor) or the reverse.
  isPredecessor: boolean
  // Name of the project it is in, when it is in one.
  project: string | null
  // Days the link is broken by going by the two tasks' dates; 0 when it holds or a task is undated.
  brokenByDays: number
}

type Dated = { start_date?: string | null; due_date: string | null }

// For a link with exactly one end on the chart (`onChart`: the folder's tasks
// by id): the other end, which side of the link it is, the project it sits in,
// and whether the dates still satisfy the link. The task on the chart is read
// from the chart, so a drag shows at once; the other end is as the server sent
// it. `folders` is the Space's folder tree.
export function externalEnd(dependency: TaskDependency, onChart: Map<number, Dated>, folders: Folder[]): ExternalEnd {
  const isPredecessor = !onChart.has(dependency.predecessor_id)
  const task = isPredecessor ? dependency.predecessor : dependency.successor
  const predecessor = spanOf(onChart.get(dependency.predecessor_id) ?? dependency.predecessor)
  const successor = spanOf(onChart.get(dependency.successor_id) ?? dependency.successor)
  return {
    task,
    isPredecessor,
    project: task?.folder_id != null ? projectOf(folders, task.folder_id)?.name ?? null : null,
    brokenByDays: predecessor && successor ? Math.max(0, linkDaysLate(dependency.kind, predecessor, successor)) : 0,
  }
}

export interface LinkCandidates { project: string; tasks: Task[] }

export const NO_PROJECT = 'No project'

// Tasks found by a search, for the editor's pickers: those already on the
// folder's chart left out, the rest grouped under the project they sit in
// (by name, with the ones in no project last).
export function linkCandidates(found: Task[], folders: Folder[], onChart: Set<number>): LinkCandidates[] {
  const groups = new Map<string, Task[]>()
  const seen = new Set<number>()
  found.forEach((task) => {
    if (onChart.has(task.id) || seen.has(task.id)) return
    seen.add(task.id)
    const folderId = taskFolderId(task)
    const project = (folderId != null ? projectOf(folders, folderId)?.name : null) ?? NO_PROJECT
    groups.set(project, [...(groups.get(project) ?? []), task])
  })
  return [...groups]
    .map(([project, tasks]) => ({ project, tasks }))
    .sort((a, b) => Number(a.project === NO_PROJECT) - Number(b.project === NO_PROJECT) || a.project.localeCompare(b.project))
}

