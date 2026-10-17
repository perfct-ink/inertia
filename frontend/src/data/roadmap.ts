import { addDays, endOfMonth, parseISO, startOfMonth } from 'date-fns'
import type { Epic, Initiative, Milestone, RoadmapHorizon } from '@/types'
import type { Scheduled } from '@/data/schedule'
import { groupBy } from '@/util/collection'

// The roadmap (PM-20 to PM-22) is a view over initiatives and epics. Two
// layouts share this file: timeline lanes grouped by milestone, and a
// Now / Next / Later board that needs no dates.

export const HORIZONS: RoadmapHorizon[] = ['now', 'next', 'later']

export const HORIZON_LABEL: Record<RoadmapHorizon, string> = {
  now: 'Now',
  next: 'Next',
  later: 'Later',
}

// Work starting within this window counts as "Next" when nobody placed it.
export const NEXT_WITHIN_DAYS = 90

type Placeable = { horizon: RoadmapHorizon | null; start_date: string | null; target_date: string | null }

// The column an item sits in: its own horizon when set by hand, otherwise
// derived. Started (start date reached) or active is Now, starting within
// NEXT_WITHIN_DAYS is Next, anything further out or undated is Later.
export function effectiveHorizon(item: Placeable & { status?: string }, today: Date = new Date()): RoadmapHorizon {
  if (item.horizon) return item.horizon
  if (item.status === 'active') return 'now'
  if (!item.start_date) return 'later'
  const start = parseISO(item.start_date)
  if (start <= today) return 'now'
  return start <= addDays(today, NEXT_WITHIN_DAYS) ? 'next' : 'later'
}

function isDone(item: { status?: string; tasks_count: number; done_tasks_count: number }) {
  return item.status === 'done' || (item.tasks_count > 0 && item.done_tasks_count === item.tasks_count)
}

export type BoardCard =
  | { kind: 'initiative'; key: string; item: Initiative; epics: Epic[] }
  | { kind: 'epic'; key: string; item: Epic }

// Board cards per column: every initiative still in flight, plus epics that
// sit under no initiative (an epic under one travels with its initiative's
// card). Finished work is left off; the board looks forward.
export function boardColumns(
  initiatives: Initiative[],
  epics: Epic[],
  today: Date = new Date(),
): Record<RoadmapHorizon, BoardCard[]> {
  const columns: Record<RoadmapHorizon, BoardCard[]> = { now: [], next: [], later: [] }
  const epicsByInitiative = groupBy(epics.filter((e) => e.initiative_id != null), (e) => e.initiative_id as number)
  initiatives.filter((i) => !isDone(i)).forEach((initiative) => {
    columns[effectiveHorizon(initiative, today)].push({
      kind: 'initiative', key: `initiative-${initiative.id}`, item: initiative, epics: epicsByInitiative.get(initiative.id) ?? [],
    })
  })
  epics.filter((e) => e.initiative_id == null && !isDone(e)).forEach((epic) => {
    columns[effectiveHorizon(epic, today)].push({ kind: 'epic', key: `epic-${epic.id}`, item: epic })
  })
  return columns
}

export interface RoadmapLane {
  key: string
  milestone: Milestone | null
  rows: Scheduled[]
}

// One lane per milestone (by target date, undated last), then "No milestone".
// Inside a lane: each initiative followed by its epics, then epics under no
// initiative. An epic under an initiative follows its initiative's lane, the
// same structural-parent-first rule the hierarchy view uses.
export function roadmapLanes(milestones: Milestone[], initiatives: Initiative[], epics: Epic[]): RoadmapLane[] {
  const epicsByInitiative = groupBy(epics.filter((e) => e.initiative_id != null), (e) => e.initiative_id as number)
  const initiativeIds = new Set(initiatives.map((i) => i.id))
  const laneOf = (milestoneId: number | null) => (milestoneId != null && milestones.some((m) => m.id === milestoneId) ? milestoneId : null)

  const rowsByLane = new Map<number | null, Scheduled[]>()
  const push = (lane: number | null, row: Scheduled) => {
    const list = rowsByLane.get(lane) ?? []
    list.push(row)
    rowsByLane.set(lane, list)
  }

  initiatives.forEach((initiative) => {
    const lane = laneOf(initiative.milestone_id)
    push(lane, { ...initiative, key: `initiative-${initiative.id}`, depth: 0, health: initiative.health })
    ;(epicsByInitiative.get(initiative.id) ?? []).forEach((epic) => push(lane, { ...epic, key: `epic-${epic.id}`, depth: 1 }))
  })
  epics
    .filter((e) => e.initiative_id == null || !initiativeIds.has(e.initiative_id))
    .forEach((epic) => push(laneOf(epic.milestone_id), { ...epic, key: `epic-${epic.id}`, depth: 0 }))

  const sorted = [...milestones].sort((a, b) => {
    if (a.target_date === b.target_date) return a.title.localeCompare(b.title)
    if (!a.target_date) return 1
    if (!b.target_date) return -1
    return a.target_date.localeCompare(b.target_date)
  })
  const lanes: RoadmapLane[] = sorted.map((m) => ({ key: `milestone-${m.id}`, milestone: m, rows: rowsByLane.get(m.id) ?? [] }))
  const loose = rowsByLane.get(null) ?? []
  if (loose.length > 0) lanes.push({ key: 'no-milestone', milestone: null, rows: loose })
  return lanes
}

// One month-aligned axis for every lane, so bars line up down the page:
// spans every dated row and every milestone target date. Null when nothing
// on the roadmap has dates yet.
export function roadmapRange(lanes: RoadmapLane[]): { start: Date; end: Date } | null {
  const dates: Date[] = []
  lanes.forEach((lane) => {
    if (lane.milestone?.target_date) dates.push(parseISO(lane.milestone.target_date))
    lane.rows.forEach((row) => {
      if (row.start_date && row.target_date) dates.push(parseISO(row.start_date), parseISO(row.target_date))
    })
  })
  if (dates.length === 0) return null
  const times = dates.map((d) => d.getTime())
  return { start: startOfMonth(new Date(Math.min(...times))), end: endOfMonth(new Date(Math.max(...times))) }
}
