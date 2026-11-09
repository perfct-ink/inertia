import type { Task, WorkspaceEvent } from '@/types'

// What a saved calendar view stores: which kinds of item are shown. The month
// being looked at is where you are, not a setting, so it is not saved.
export interface CalendarConfig {
  showTasks: boolean
  showEvents: boolean
}

export const DEFAULT_CALENDAR_CONFIG: CalendarConfig = { showTasks: true, showEvents: true }

// A stored config that may be old or malformed, as a safe one.
export function parseCalendarConfig(raw: unknown): CalendarConfig {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    showTasks: typeof value.showTasks === 'boolean' ? value.showTasks : DEFAULT_CALENDAR_CONFIG.showTasks,
    showEvents: typeof value.showEvents === 'boolean' ? value.showEvents : DEFAULT_CALENDAR_CONFIG.showEvents,
  }
}

export interface CalendarItem {
  key: string
  kind: 'task' | 'event'
  title: string
  done: boolean
}

// What goes on each day (yyyy-MM-dd) of the calendar: tasks on their due date
// (done ones marked) and events on their date, tasks first then events by title.
export function calendarItems(tasks: Task[], events: WorkspaceEvent[], showTasks = true, showEvents = true): Map<string, CalendarItem[]> {
  const byDate = new Map<string, CalendarItem[]>()
  const add = (date: string, item: CalendarItem) => byDate.set(date, [...(byDate.get(date) ?? []), item])
  if (showTasks) tasks.filter((t) => t.due_date).forEach((t) => add(t.due_date as string, { key: `task-${t.id}`, kind: 'task', title: t.title, done: t.status === 'done' }))
  if (showEvents) events.forEach((e) => add(e.date, { key: `event-${e.id}`, kind: 'event', title: e.title, done: false }))
  byDate.forEach((items, date) => byDate.set(date, [...items].sort((a, b) => (a.kind === b.kind ? a.title.localeCompare(b.title) : a.kind === 'task' ? -1 : 1))))
  return byDate
}
