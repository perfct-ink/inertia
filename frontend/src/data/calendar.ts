import type { DocumentDate, Task, WorkspaceEvent } from '@/types'
import { dateEntryTitle, documentDatePath } from './documentDate'

export interface CalendarItem {
  key: string
  kind: 'task' | 'event' | 'date'
  title: string
  done: boolean
  // Where a date entry opens: its chip in the document (null for tasks, events and entries kept after their line was deleted).
  href: string | null
  // The calendar entry behind a date chip, so the calendar can change it.
  entry?: DocumentDate
}

const KIND_ORDER: Record<CalendarItem['kind'], number> = { task: 0, event: 1, date: 2 }

// What goes on each day (yyyy-MM-dd) of the calendar: tasks on their due date
// (done ones marked), events on their date and date chips from documents on
// their day; within a day tasks come first, then events, then dates, each by title.
export function calendarItems(
  tasks: Task[],
  events: WorkspaceEvent[],
  showTasks = true,
  showEvents = true,
  dates: DocumentDate[] = [],
  showDates = true,
): Map<string, CalendarItem[]> {
  const byDate = new Map<string, CalendarItem[]>()
  const add = (date: string, item: CalendarItem) => byDate.set(date, [...(byDate.get(date) ?? []), item])
  if (showTasks) tasks.filter((t) => t.due_date).forEach((t) => add(t.due_date as string, { key: `task-${t.id}`, kind: 'task', title: t.title, done: t.status === 'done', href: null }))
  if (showEvents) events.forEach((e) => add(e.date, { key: `event-${e.id}`, kind: 'event', title: e.title, done: false, href: null }))
  if (showDates) dates.forEach((d) => add(d.date, { key: `date-${d.id}`, kind: 'date', title: dateEntryTitle(d), done: false, href: documentDatePath(d), entry: d }))
  byDate.forEach((items, date) => byDate.set(date, [...items].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.title.localeCompare(b.title))))
  return byDate
}
