import { format } from 'date-fns'
import type { Task, WorkspaceEvent } from '@/types'

export const EVENT_TYPES: WorkspaceEvent['event_type'][] = ['deadline', 'milestone']

// Tasks whose title contains the query, ignoring case; an empty query keeps all.
export function filterTasksByTitle(tasks: Task[], query: string): Task[] {
  const q = query.toLowerCase()
  return tasks.filter((t) => t.title.toLowerCase().includes(q))
}

// Tasks that aren't already linked to the event.
export function unlinkedTasks(allTasks: Task[], event: Pick<WorkspaceEvent, 'tasks'>): Task[] {
  const linkedIds = new Set(event.tasks.map((t) => t.id))
  return allTasks.filter((t) => !linkedIds.has(t.id))
}

// Events from today on, and events before today. `now` is the clock, so this
// can be tested.
export function splitEvents(events: WorkspaceEvent[], now: Date = new Date()): { upcoming: WorkspaceEvent[]; past: WorkspaceEvent[] } {
  const today = format(now, 'yyyy-MM-dd')
  return {
    upcoming: events.filter((e) => e.date >= today),
    past: events.filter((e) => e.date < today),
  }
}
