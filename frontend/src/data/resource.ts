import { addDays, addWeeks, format, parseISO, startOfWeek } from 'date-fns'
import type { ResourceAllocation, WorkspaceMember } from '@/types'

// Resource planning: each person has a weekly capacity (hours) and is
// allocated hours a week to projects. Pure functions only, so they are easy to
// test; the Resources screen and API hooks live elsewhere.

// Hours in a week: the most anyone can have as capacity or be allocated.
// Mirrors WorkspaceMembership::MAX_WEEKLY_HOURS in the API.
export const MAX_WEEKLY_HOURS = 168
export const WEEKS_SHOWN = 8

const DATE = 'yyyy-MM-dd'

const round = (n: number) => Math.round(n * 100) / 100

// ── Weeks (Monday to Sunday, named by their Monday as yyyy-MM-dd) ─────────────

// The Monday of the week a date falls in.
export function weekStart(date: string): string {
  return format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), DATE)
}

// The Sunday that ends the week starting on `week`.
export function weekEnd(week: string): string {
  return format(addDays(parseISO(week), 6), DATE)
}

// `count` consecutive weeks, starting with the week of `from` and moved by
// `offset` weeks (negative goes back).
export function weekRange(from: string, count: number, offset = 0): string[] {
  const first = addWeeks(parseISO(weekStart(from)), offset)
  return Array.from({ length: count }, (_, i) => format(addWeeks(first, i), DATE))
}

// "Nov 2": how a week is labelled.
export function weekLabel(week: string): string {
  return format(parseISO(week), 'MMM d')
}

// ── Allocations ───────────────────────────────────────────────────────────────

type Dated = Pick<ResourceAllocation, 'start_date' | 'end_date'>

// Whether an allocation covers any day of the week starting on `week`. It then
// counts for the whole week: hours_per_week is a weekly rate, so a part week is
// not prorated (this errs towards warning about over-allocation).
export function isActiveInWeek(allocation: Dated, week: string): boolean {
  if (allocation.start_date && allocation.start_date > weekEnd(week)) return false
  if (allocation.end_date && allocation.end_date < week) return false
  return true
}

// Allocations that have not finished before the first visible week, so ones
// that ended long ago don't clutter the plan; earlier weeks bring them back.
export function currentAllocations<T extends Dated>(allocations: T[], firstWeek: string): T[] {
  return allocations.filter((a) => !a.end_date || a.end_date >= firstWeek)
}

// "Nov 2, 2026 to Dec 4, 2026", "From Nov 2, 2026, ongoing", "Until Dec 4, 2026" or "Ongoing".
export function allocationPeriod({ start_date, end_date }: Dated): string {
  const day = (date: string) => format(parseISO(date), 'MMM d, yyyy')
  if (start_date && end_date) return `${day(start_date)} to ${day(end_date)}`
  if (start_date) return `From ${day(start_date)}, ongoing`
  if (end_date) return `Until ${day(end_date)}`
  return 'Ongoing'
}

// ── Load per person and per project ───────────────────────────────────────────

export interface WeekLoad {
  week: string
  // Hours allocated across all projects in the week.
  allocated: number
  // Capacity minus allocated; negative when over-allocated.
  free: number
  // Hours above capacity (0 when within it).
  over: number
  // Allocated hours by project (folder id).
  byProject: Record<number, number>
}

export interface PersonLoad {
  memberId: number
  userId: number
  name: string
  capacity: number
  weeks: WeekLoad[]
  // How many of the visible weeks are over capacity.
  overWeeks: number
  // Their allocations that haven't finished before the first visible week.
  allocations: ResourceAllocation[]
}

// Each member's allocated hours per week against their capacity, by name.
export function personLoads(members: WorkspaceMember[], allocations: ResourceAllocation[], weeks: string[]): PersonLoad[] {
  return members
    .map((member) => {
      const mine = allocations.filter((a) => a.user_id === member.user_id)
      const capacity = member.weekly_capacity_hours
      const loads = weeks.map((week): WeekLoad => {
        const byProject: Record<number, number> = {}
        mine.filter((a) => isActiveInWeek(a, week)).forEach((a) => {
          byProject[a.folder_id] = round((byProject[a.folder_id] ?? 0) + a.hours_per_week)
        })
        const allocated = round(Object.values(byProject).reduce((sum, hours) => sum + hours, 0))
        return { week, allocated, free: round(capacity - allocated), over: round(Math.max(0, allocated - capacity)), byProject }
      })
      return {
        memberId: member.id,
        userId: member.user_id,
        name: member.user.name,
        capacity,
        weeks: loads,
        overWeeks: loads.filter((w) => w.over > 0).length,
        allocations: sortAllocations(currentAllocations(mine, weeks[0] ?? '')),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

// The people with at least one visible week over capacity.
export function overAllocated(loads: PersonLoad[]): PersonLoad[] {
  return loads.filter((load) => load.overWeeks > 0)
}

export interface ProjectLoad {
  folderId: number
  weeks: { week: string; hours: number; people: number }[]
  allocations: ResourceAllocation[]
}

// Hours and head count per week for each project that has an allocation which
// hasn't finished before the first visible week.
export function projectLoads(allocations: ResourceAllocation[], weeks: string[]): ProjectLoad[] {
  const current = currentAllocations(allocations, weeks[0] ?? '')
  const folderIds = [...new Set(current.map((a) => a.folder_id))]
  return folderIds.map((folderId) => {
    const mine = sortAllocations(current.filter((a) => a.folder_id === folderId))
    return {
      folderId,
      allocations: mine,
      weeks: weeks.map((week) => {
        const active = mine.filter((a) => isActiveInWeek(a, week))
        return {
          week,
          hours: round(active.reduce((sum, a) => sum + a.hours_per_week, 0)),
          people: new Set(active.map((a) => a.user_id)).size,
        }
      }),
    }
  })
}

// Earliest start first (no start, already under way, comes first), then oldest.
function sortAllocations(allocations: ResourceAllocation[]): ResourceAllocation[] {
  return [...allocations].sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? '') || a.id - b.id)
}

// What to say under a week's hours: how far over, how much is free, or that it is full.
export function weekNote({ allocated, free, over }: WeekLoad): string {
  if (over > 0) return `Over by ${formatHours(over)} h`
  if (free > 0) return `${formatHours(free)} h free`
  return allocated > 0 ? 'Full' : 'No capacity'
}

// How full a week is, as a whole percent (can pass 100). No capacity with any
// hours allocated counts as 100.
export function loadPercent(allocated: number, capacity: number): number {
  if (capacity > 0) return Math.round((allocated / capacity) * 100)
  return allocated > 0 ? 100 : 0
}

// ── Hours as text ─────────────────────────────────────────────────────────────

// 12.5 -> "12.5", 40 -> "40": up to two decimals, none when whole.
export function formatHours(hours: number): string {
  return String(round(hours))
}

export const HOURS_ERROR = `Enter hours per week above 0, up to ${MAX_WEEKLY_HOURS}.`
export const CAPACITY_ERROR = `Enter hours from 0 to ${MAX_WEEKLY_HOURS}.`

// The problem with a new allocation's form values (all as typed), or null when
// it can be sent. The API checks these again.
export function allocationError({ folderId, hours, start, end }: { folderId: string; hours: string; start: string; end: string }): string | null {
  if (!folderId) return 'Choose a project.'
  if (parseHours(hours) === null) return HOURS_ERROR
  if (start && end && end < start) return "The end date can't be before the start date."
  return null
}

// Hours typed into a field: a number within a week, or null when it isn't.
// Zero is accepted only where it means something (a capacity of 0, e.g. on leave).
export function parseHours(text: string, { allowZero = false }: { allowZero?: boolean } = {}): number | null {
  if (text.trim() === '') return null
  const hours = Number(text)
  if (!Number.isFinite(hours) || hours < 0 || hours > MAX_WEEKLY_HOURS) return null
  if (hours === 0 && !allowZero) return null
  return round(hours)
}
