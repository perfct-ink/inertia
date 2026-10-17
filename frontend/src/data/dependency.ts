import type { DependencyKind, TaskDependency } from '@/types'

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
