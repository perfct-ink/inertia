import type { Task, WorkspaceEvent } from '@/types'

export interface PlanningSummary {
  tasksCount: number
  doneTasksCount: number
  percent: number
  overdueCount: number
  // The next few events on or after today, soonest first.
  upcomingEvents: WorkspaceEvent[]
}

// What the top of a document shows about its plan: how many of its tasks are
// done, how many are overdue (open and past their due date), and the next
// events in its folder. `today` is yyyy-MM-dd.
export function planningSummary(tasks: Task[], events: WorkspaceEvent[], today: string, eventLimit = 3): PlanningSummary {
  const done = tasks.filter((t) => t.status === 'done').length
  return {
    tasksCount: tasks.length,
    doneTasksCount: done,
    percent: tasks.length === 0 ? 0 : Math.round((done * 100) / tasks.length),
    overdueCount: tasks.filter((t) => t.status !== 'done' && t.due_date !== null && t.due_date < today).length,
    upcomingEvents: events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title)).slice(0, eventLimit),
  }
}
