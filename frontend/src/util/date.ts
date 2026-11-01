import { addDays, format, isPast, isToday, parseISO } from 'date-fns'

// Today's date as YYYY-MM-DD in the user's local time zone (what date inputs and the API use).
export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// A YYYY-MM-DD date moved by a number of days (negative goes back).
export function addDaysISO(date: string, days: number): string {
  return format(addDays(parseISO(date), days), 'yyyy-MM-dd')
}

export type DateStatus = 'overdue' | 'today' | 'upcoming'

// Where a YYYY-MM-DD date sits relative to today.
export function dateStatus(dateStr: string): DateStatus {
  const d = new Date(dateStr + 'T00:00:00')
  if (isToday(d)) return 'today'
  return isPast(d) ? 'overdue' : 'upcoming'
}
