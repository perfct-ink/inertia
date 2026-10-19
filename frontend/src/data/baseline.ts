import { differenceInCalendarDays, parseISO } from 'date-fns'
import { ganttTaskKey, type Scheduled } from '@/data/schedule'
import type { Baseline } from '@/types'

// Puts each task row's planned dates (from a baseline) on the row so the Gantt
// can draw planned against actual. Rows with no baseline entry are unchanged.
export function withBaseline(rows: Scheduled[], baseline: Baseline | null | undefined): Scheduled[] {
  if (!baseline) return rows
  const planned = new Map(baseline.tasks.map((t) => [ganttTaskKey(t.task_id), t]))
  return rows.map((row) => {
    const p = row.key ? planned.get(row.key) : undefined
    return p ? { ...row, baseline: { start_date: p.start_date ?? p.due_date, target_date: p.due_date } } : row
  })
}

// How many days later (positive) or earlier a task now ends than planned.
export function slipDays(row: Scheduled): number | null {
  if (!row.baseline || !row.target_date) return null
  return differenceInCalendarDays(parseISO(row.target_date), parseISO(row.baseline.target_date))
}
