// Calendar math for the date picker. Dates are YYYY-MM-DD strings (what the API
// and native date inputs use); arithmetic runs in UTC so the time zone and
// daylight saving never move a day.

export interface CalendarDay {
  iso: string
  day: number
  // False for the leading/trailing days that belong to the neighbouring months.
  inMonth: boolean
}

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const pad = (n: number, width = 2) => String(n).padStart(width, '0')

export function toISODate(year: number, month: number, day: number): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`
}

// Parses a real calendar date ("2026-02-30" and "2026-13-01" are not).
export function parseISODate(text: string): { year: number; month: number; day: number } | null {
  const match = ISO_PATTERN.exec(text)
  if (!match) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return { year, month, day }
}

export const isValidISODate = (text: string) => parseISODate(text) !== null

function fromUTC(date: Date): string {
  return toISODate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

export function addDays(iso: string, days: number): string {
  const parsed = parseISODate(iso)
  if (!parsed) return iso
  return fromUTC(new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days)))
}

// Moves by whole months and keeps the day of the month where it exists
// (31 Jan + 1 month = 28/29 Feb).
export function addMonths(iso: string, months: number): string {
  const parsed = parseISODate(iso)
  if (!parsed) return iso
  const firstOfTarget = new Date(Date.UTC(parsed.year, parsed.month - 1 + months, 1))
  const lastDay = new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, 0)).getUTCDate()
  return toISODate(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, Math.min(parsed.day, lastDay))
}

// Day of the week, 0 = Sunday.
export function weekday(iso: string): number {
  const parsed = parseISODate(iso)
  return parsed ? new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay() : 0
}

export function startOfWeek(iso: string, weekStartsOn = 0): string {
  return addDays(iso, -((weekday(iso) - weekStartsOn + 7) % 7))
}

// Always six weeks, so the popup keeps one height as the month changes.
export function monthGrid(year: number, month: number, weekStartsOn = 0): CalendarDay[][] {
  const first = toISODate(year, month, 1)
  const start = startOfWeek(first, weekStartsOn)
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, dayOfWeek) => {
      const iso = addDays(start, week * 7 + dayOfWeek)
      const parsed = parseISODate(iso)!
      return { iso, day: parsed.day, inMonth: parsed.month === month && parsed.year === year }
    }))
}

// Whether a date is outside the optional min/max bounds (inclusive), like the native input's.
export function outOfRange(iso: string, min?: string, max?: string): boolean {
  return (!!min && isValidISODate(min) && iso < min) || (!!max && isValidISODate(max) && iso > max)
}

// Moves a date into the bounds, for choosing where the popup opens.
export function clampToRange(iso: string, min?: string, max?: string): string {
  if (min && isValidISODate(min) && iso < min) return min
  if (max && isValidISODate(max) && iso > max) return max
  return iso
}

const atUTC = (iso: string) => {
  const parsed = parseISODate(iso)!
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day))
}

// "November 2026"
export function monthLabel(year: number, month: number, locale?: string): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

// "Monday, November 2, 2026", for screen readers.
export function dayLabel(iso: string, locale?: string): string {
  return isValidISODate(iso) ? atUTC(iso).toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : iso
}

// Column headings from the first day of the week: [{ short: 'Su', full: 'Sunday' }, ...]
export function weekdayHeadings(weekStartsOn = 0, locale?: string): { short: string; full: string }[] {
  // 2026-11-01 is a Sunday.
  return Array.from({ length: 7 }, (_, i) => {
    const date = atUTC(addDays('2026-11-01', weekStartsOn + i))
    return {
      short: date.toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' }).slice(0, 2),
      full: date.toLocaleDateString(locale, { weekday: 'long', timeZone: 'UTC' }),
    }
  })
}
