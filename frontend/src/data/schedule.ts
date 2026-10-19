import { addDays, format, parseISO } from 'date-fns'
import type { MilestoneHealth } from '@/types'

// "A title, an optional start/target date, and a tasks_count/done_tasks_count
// rollup" - shared by epics, initiatives and folder timelines.
export interface Scheduled {
  id: number
  title: string
  start_date: string | null
  target_date: string | null
  tasks_count: number
  done_tasks_count: number
  // Nesting level in the rendered list; 0 (or absent) is top level.
  depth?: number
  // React key when rows mix kinds whose ids can collide (initiatives and
  // epics are separate sequences); falls back to id.
  key?: string
  // Colors the bar by health (roadmap); absent draws the default bar.
  health?: MilestoneHealth
  // On the driving (critical) path of a Gantt chart.
  critical?: boolean
  // Planned dates from a baseline, drawn as a thin bar under the actual one.
  baseline?: { start_date: string; target_date: string }
}

// Whole-number percentage of an item's tasks that are done. Narrower than
// Scheduled on purpose — this is the only field pair it actually needs, so
// anything with a tasks_count/done_tasks_count rollup can use it (e.g.
// Sprint, which has no start/target dates in the Scheduled sense).
export function donePercent(item: { tasks_count: number; done_tasks_count: number }): number {
  return item.tasks_count > 0 ? Math.round((item.done_tasks_count / item.tasks_count) * 100) : 0
}

type Epicish = Scheduled
type TaskLike = { id: number; title: string; status: string; epic_id: number | null; start_date?: string | null; due_date: string | null }

// Row key for a task on the Gantt, so dependency links can name their ends.
export function ganttTaskKey(taskId: number): string {
  return `task-${taskId}`
}

// Flat Gantt rows grouped by hierarchy: each epic followed by its dated tasks
// (depth 1), then tasks with no epic. Tasks without a due_date are skipped, as
// they have no end to draw. Epic and task ids are independent sequences, so
// rows carry a `key` (epic-1, task-1) that Timeline uses for React keys and
// dependency links; task ids also stay negated for anything still keying on
// id. `critical` flags tasks on the driving path. A task whose epic
// has no dates (so it won't be drawn) stays top level instead of nesting under
// a missing parent.
export function groupGanttRows(epics: Epicish[], tasks: TaskLike[], critical: Set<number> = new Set()): Scheduled[] {
  const toRow = (t: TaskLike, depth: number): Scheduled => ({
    id: -t.id,
    key: ganttTaskKey(t.id),
    critical: critical.has(t.id),
    title: t.title,
    start_date: t.start_date ?? null,
    target_date: t.due_date,
    tasks_count: 1,
    done_tasks_count: t.status === 'done' ? 1 : 0,
    depth,
  })
  const dated = tasks.filter((t) => t.due_date)
  const drawnEpics = new Set(epics.filter((e) => e.start_date && e.target_date).map((e) => e.id))
  const rows: Scheduled[] = []
  for (const epic of epics) {
    rows.push({ ...epic, key: `epic-${epic.id}`, depth: 0 })
    if (drawnEpics.has(epic.id)) {
      dated.filter((t) => t.epic_id === epic.id).forEach((t) => rows.push(toRow(t, 1)))
    }
  }
  dated.filter((t) => t.epic_id === null || !drawnEpics.has(t.epic_id)).forEach((t) => rows.push(toRow(t, 0)))
  return rows
}

export type DragMode = 'move' | 'start' | 'end'

// New start/end dates (yyyy-MM-dd) after dragging a bar by `deltaDays`: `move`
// shifts both ends, `start`/`end` resize one edge. An edge can reach but not
// cross the other (a one-day bar stays one day), so the end never lands
// before the start.
export function shiftedRange(startDate: string, endDate: string, mode: DragMode, deltaDays: number): { start: string; end: string } {
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd')
  if (mode === 'move') return { start: fmt(addDays(start, deltaDays)), end: fmt(addDays(end, deltaDays)) }
  if (mode === 'start') {
    const moved = addDays(start, deltaDays)
    return { start: fmt(moved > end ? end : moved), end: endDate }
  }
  const moved = addDays(end, deltaDays)
  return { start: startDate, end: fmt(moved < start ? start : moved) }
}
