import {
  addDays, differenceInCalendarDays, eachDayOfInterval, eachMonthOfInterval, eachQuarterOfInterval, eachWeekOfInterval, eachYearOfInterval,
  endOfMonth, endOfQuarter, endOfWeek, endOfYear, format, isWeekend, parseISO, startOfMonth, startOfQuarter, startOfWeek, startOfYear,
} from 'date-fns'
import type { DependencyKind, MilestoneHealth, TaskDependency } from '@/types'
import { compareByTargetDate } from '@/data/milestone'
import { groupBy } from '@/util/collection'

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
  // A milestone or initiative row heading the epics under it (Gantt): drawn
  // bolder and, as its dates are a roll-up, not draggable.
  group?: boolean
}

// Whole-number percentage of an item's tasks that are done. Narrower than
// Scheduled on purpose — this is the only field pair it actually needs, so
// anything with a tasks_count/done_tasks_count rollup can use it (e.g.
// Sprint, which has no start/target dates in the Scheduled sense).
export function donePercent(item: { tasks_count: number; done_tasks_count: number }): number {
  return item.tasks_count > 0 ? Math.round((item.done_tasks_count / item.tasks_count) * 100) : 0
}

type Epicish = Scheduled & { initiative_id?: number | null; milestone_id?: number | null }
type TaskLike = {
  id: number
  title: string
  status: string
  epic_id: number | null
  milestone_id?: number | null
  start_date?: string | null
  due_date: string | null
}

// What can head a group of Gantt rows (see groupGanttRows).
export type GanttInitiative = Scheduled & { milestone_id?: number | null }
export type GanttMilestone = {
  id: number
  title: string
  target_date: string | null
  tasks_count: number
  done_tasks_count: number
  health?: MilestoneHealth
}
export interface GanttGroups {
  initiatives?: GanttInitiative[]
  milestones?: GanttMilestone[]
  // Keep an initiative that has no epic or task under it (the Initiatives
  // page lists every initiative); otherwise empty ones are left off.
  keepEmptyInitiatives?: boolean
}

// Row key for a task on the Gantt, so dependency links can name their ends.
export function ganttTaskKey(taskId: number): string {
  return `task-${taskId}`
}

// The arrows between task rows for these dependencies, named by row key.
export function ganttLinks(dependencies: TaskDependency[]): { from: string; to: string; kind: DependencyKind }[] {
  return dependencies.map((d) => ({ from: ganttTaskKey(d.predecessor_id), to: ganttTaskKey(d.successor_id), kind: d.kind }))
}

type Span = { start: string; end: string }
type GanttNode = { kind: 'milestone' | 'initiative' | 'epic' | 'task'; row: Scheduled; children: GanttNode[] }

const isGroup = (node: GanttNode) => node.kind === 'milestone' || node.kind === 'initiative'
// Both ends set: the only rows Timeline can draw.
const ownSpan = (row: Scheduled): Span | null => (row.start_date && row.target_date ? { start: row.start_date, end: row.target_date } : null)
// ISO dates compare as strings.
const merge = (a: Span | null, b: Span | null): Span | null => {
  if (!a || !b) return a ?? b
  return { start: a.start < b.start ? a.start : b.start, end: a.end > b.end ? a.end : b.end }
}

// Every date a node and the rows under it are drawn at. A group counts a lone
// start or target date too (a milestone only has a target).
function coverage(node: GanttNode): Span | null {
  let span = ownSpan(node.row)
  if (isGroup(node)) {
    for (const date of [node.row.start_date, node.row.target_date]) if (date) span = merge(span, { start: date, end: date })
  }
  return node.children.reduce((acc, child) => merge(acc, coverage(child)), span)
}

// The dates a group row is drawn with: its own when it has both (an
// initiative's plan), otherwise rolled up from what is under it.
const groupSpan = (node: GanttNode): Span | null => ownSpan(node.row) ?? coverage(node)

// Flattens the tree into rows. A group with nothing under it, or with no dates
// to draw, adds no row, and its children take its place without the indent.
// Whether a node draws anything below a group header: an epic or task, or an
// initiative the page lists even when empty.
function hasContent(node: GanttNode, keepEmptyInitiatives: boolean): boolean {
  if (!isGroup(node)) return true
  if (keepEmptyInitiatives && node.kind === 'initiative') return true
  return node.children.some((child) => hasContent(child, keepEmptyInitiatives))
}

function emitRows(node: GanttNode, depth: number, keepEmptyInitiatives: boolean, out: Scheduled[]) {
  if (!isGroup(node)) {
    out.push({ ...node.row, depth })
    node.children.forEach((child) => emitRows(child, depth + 1, keepEmptyInitiatives, out))
    return
  }
  const span = groupSpan(node)
  const listed = keepEmptyInitiatives && node.kind === 'initiative'
  if (!listed && (!span || !hasContent(node, keepEmptyInitiatives))) {
    node.children.forEach((child) => emitRows(child, depth, keepEmptyInitiatives, out))
    return
  }
  out.push(span ? { ...node.row, start_date: span.start, target_date: span.end, depth } : { ...node.row, depth })
  node.children.forEach((child) => emitRows(child, depth + 1, keepEmptyInitiatives, out))
}

// Flat Gantt rows grouped by hierarchy: milestone > initiative > epic > task,
// each level indented one step. Without `groups` it is epic > task: each epic
// followed by its dated tasks, then tasks with no epic. Tasks without a
// due_date are skipped, as they have no end to draw. Row ids are independent
// sequences, so rows carry a `key` (epic-1, task-1) that Timeline uses for
// React keys and dependency links; task ids also stay negated for anything
// still keying on id. `critical` flags tasks on the driving path.
//
// Nesting follows the structural parent first, as the hierarchy view does: an
// epic goes under its initiative, else under its own milestone; an initiative
// under its milestone; a task under its epic, else under its own milestone. A
// parent that is not in `groups` (or an epic with no dates, which won't be
// drawn) is treated as absent, so the item stays at the level above instead of
// nesting under a missing row. Milestones come first by target date, then
// whatever has no milestone. A group with its own start and target date (an
// initiative) keeps them; otherwise it spans the rows under it, and a
// milestone also reaches its target date.
export function groupGanttRows(
  epics: Epicish[],
  tasks: TaskLike[],
  critical: Set<number> = new Set(),
  groups: GanttGroups = {},
): Scheduled[] {
  const taskNode = (t: TaskLike): GanttNode => ({
    kind: 'task',
    children: [],
    row: {
      id: -t.id,
      key: ganttTaskKey(t.id),
      critical: critical.has(t.id),
      title: t.title,
      start_date: t.start_date ?? null,
      target_date: t.due_date,
      tasks_count: 1,
      done_tasks_count: t.status === 'done' ? 1 : 0,
    },
  })
  const dated = tasks.filter((t) => t.due_date)
  const drawnEpics = new Set(epics.filter((e) => e.start_date && e.target_date).map((e) => e.id))
  const tasksByEpic = groupBy(dated.filter((t) => t.epic_id !== null && drawnEpics.has(t.epic_id)), (t) => t.epic_id)

  const milestones = [...(groups.milestones ?? [])].sort(compareByTargetDate)
  const milestoneIds = new Set(milestones.map((m) => m.id))
  const milestoneOf = (id: number | null | undefined) => (id != null && milestoneIds.has(id) ? id : null)
  // What sits directly under each milestone (null: under none), in the order
  // initiatives, epics with no initiative, tasks with no drawn epic.
  const under = new Map<number | null, GanttNode[]>()
  const place = (milestoneId: number | null, node: GanttNode) => {
    const list = under.get(milestoneId) ?? []
    list.push(node)
    under.set(milestoneId, list)
  }

  const initiativeNodes = new Map<number, GanttNode>()
  for (const initiative of groups.initiatives ?? []) {
    const node: GanttNode = { kind: 'initiative', children: [], row: { ...initiative, key: `initiative-${initiative.id}`, group: true } }
    initiativeNodes.set(initiative.id, node)
    place(milestoneOf(initiative.milestone_id), node)
  }
  for (const epic of epics) {
    const node: GanttNode = {
      kind: 'epic',
      row: { ...epic, key: `epic-${epic.id}` },
      children: (tasksByEpic.get(epic.id) ?? []).map(taskNode),
    }
    const initiativeNode = epic.initiative_id != null ? initiativeNodes.get(epic.initiative_id) : undefined
    if (initiativeNode) initiativeNode.children.push(node)
    else place(milestoneOf(epic.milestone_id), node)
  }
  dated
    .filter((t) => t.epic_id === null || !drawnEpics.has(t.epic_id))
    .forEach((t) => place(milestoneOf(t.milestone_id), taskNode(t)))

  const roots: GanttNode[] = milestones.map((m) => ({
    kind: 'milestone',
    children: under.get(m.id) ?? [],
    row: {
      id: m.id,
      key: `milestone-${m.id}`,
      title: m.title,
      start_date: null,
      target_date: m.target_date,
      tasks_count: m.tasks_count,
      done_tasks_count: m.done_tasks_count,
      group: true,
      ...(m.health && { health: m.health }),
    },
  }))
  const rows: Scheduled[] = []
  const top = [...roots, ...(under.get(null) ?? [])]
  top.forEach((node) => emitRows(node, 0, Boolean(groups.keepEmptyInitiatives), rows))
  return rows
}

// The milestone > initiative > epic > task rows of the Space-wide Epics and
// Initiatives timelines. Only tasks under one of the listed epics are drawn:
// loose tasks belong to the folder Gantt and would bury the epics here.
export function planningGanttRows(
  plan: { milestones: GanttMilestone[]; initiatives: GanttInitiative[]; epics: Epicish[]; tasks: TaskLike[] },
  keepEmptyInitiatives = false,
): Scheduled[] {
  const epicIds = new Set(plan.epics.map((e) => e.id))
  const tasks = plan.tasks.filter((t) => t.epic_id !== null && epicIds.has(t.epic_id))
  return groupGanttRows(plan.epics, tasks, undefined, { initiatives: plan.initiatives, milestones: plan.milestones, keepEmptyInitiatives })
}

// Diamonds for a Timeline's marker row: the milestones that have a date.
export function milestoneMarkers(milestones: { id: number; title: string; target_date: string | null }[]): { id: number; title: string; target_date: string }[] {
  return milestones.flatMap((m) => (m.target_date ? [{ id: m.id, title: m.title, target_date: m.target_date }] : []))
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


// ── Gantt zoom ───────────────────────────────────────────────────────────────

export type GanttZoom = 'day' | 'week' | 'month' | 'quarter' | 'year'
export const GANTT_ZOOMS: GanttZoom[] = ['day', 'week', 'month', 'quarter', 'year']
export const GANTT_ZOOM_LABEL: Record<GanttZoom, string> = { day: 'Days', week: 'Weeks', month: 'Months', quarter: 'Quarters', year: 'Years' }

// Track width in pixels for one day at each zoom. Month is the original fit-to-width axis.
export const ZOOM_DAY_PX: Record<GanttZoom, number> = { day: 36, week: 14, month: 0, quarter: 3, year: 1 }

const PERIODS: Record<GanttZoom, {
  each: (range: { start: Date; end: Date }) => Date[]
  end: (date: Date) => Date
  label: (date: Date) => string
}> = {
  day: { each: eachDayOfInterval, end: (d) => d, label: (d) => format(d, 'd') },
  week: { each: (r) => eachWeekOfInterval(r, { weekStartsOn: 1 }), end: (d) => endOfWeek(d, { weekStartsOn: 1 }), label: (d) => format(d, 'MMM d') },
  month: { each: eachMonthOfInterval, end: endOfMonth, label: (d) => format(d, 'MMM yyyy') },
  quarter: { each: eachQuarterOfInterval, end: endOfQuarter, label: (d) => format(d, 'QQQ yyyy') },
  year: { each: eachYearOfInterval, end: endOfYear, label: (d) => format(d, 'yyyy') },
}

const PERIOD_START: Record<GanttZoom, (d: Date) => Date> = {
  day: (d) => d, week: (d) => startOfWeek(d, { weekStartsOn: 1 }), month: startOfMonth, quarter: startOfQuarter, year: startOfYear,
}

export interface AxisTick { key: string; label: string; days: number }

// The labelled periods across [start, end] at a zoom. `days` is how much of the
// period falls inside the range, so tick widths add up to the whole axis.
export function axisTicks(start: Date, end: Date, zoom: GanttZoom): AxisTick[] {
  const period = PERIODS[zoom]
  return period.each({ start: PERIOD_START[zoom](start), end }).map((periodStart) => {
    const from = periodStart < start ? start : periodStart
    const to = period.end(periodStart) > end ? end : period.end(periodStart)
    return { key: periodStart.toISOString(), label: period.label(periodStart), days: differenceInCalendarDays(to, from) + 1 }
  })
}

// Runs of weekend days inside [start, end] as day offsets from start (Saturday
// and Sunday together are one run).
export function weekendSpans(start: Date, end: Date): { offset: number; days: number }[] {
  const spans: { offset: number; days: number }[] = []
  eachDayOfInterval({ start, end }).forEach((day, offset) => {
    if (!isWeekend(day)) return
    const last = spans[spans.length - 1]
    if (last && last.offset + last.days === offset) last.days += 1
    else spans.push({ offset, days: 1 })
  })
  return spans
}

// The pixel width the chart needs at a zoom (0 = fit the page, as before).
export function trackWidthPx(totalDays: number, zoom: GanttZoom): number {
  return Math.round(totalDays * ZOOM_DAY_PX[zoom])
}
// Flat rows for a timeline of tasks: every task with a due date, ordered by
// start (or due date when it has no start), each one level deep. `critical`
// flags the tasks on the driving path.
export function flatTaskRows(tasks: TaskLike[], critical: Set<number> = new Set()): Scheduled[] {
  const dated = tasks.filter((t) => t.due_date)
  return dated
    .map((t) => ({
      id: -t.id,
      key: ganttTaskKey(t.id),
      critical: critical.has(t.id),
      title: t.title,
      start_date: t.start_date ?? t.due_date,
      target_date: t.due_date,
      tasks_count: 1,
      done_tasks_count: t.status === 'done' ? 1 : 0,
      depth: 0,
    }))
    .sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? '') || a.title.localeCompare(b.title))
}
