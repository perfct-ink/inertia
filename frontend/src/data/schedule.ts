// "A title, an optional start/target date, and a tasks_count/done_tasks_count
// rollup" - shared by epics, initiatives and folder timelines.
export interface Scheduled {
  id: number
  title: string
  start_date: string | null
  target_date: string | null
  tasks_count: number
  done_tasks_count: number
}

// Whole-number percentage of an item's tasks that are done. Narrower than
// Scheduled on purpose — this is the only field pair it actually needs, so
// anything with a tasks_count/done_tasks_count rollup can use it (e.g.
// Sprint, which has no start/target dates in the Scheduled sense).
export function donePercent(item: { tasks_count: number; done_tasks_count: number }): number {
  return item.tasks_count > 0 ? Math.round((item.done_tasks_count / item.tasks_count) * 100) : 0
}
