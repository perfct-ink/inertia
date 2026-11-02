import { STATUS_LABEL } from '@/data/task'
import type { Task } from '@/types'

export type PivotDimension = 'status' | 'epic' | 'sprint' | 'assignee'

export const PIVOT_DIMENSIONS: { value: PivotDimension; label: string }[] = [
  { value: 'status', label: 'Status' },
  { value: 'epic', label: 'Epic' },
  { value: 'sprint', label: 'Sprint' },
  { value: 'assignee', label: 'Assignee' },
]

// Names to show for ids; anything missing falls back to the "none" label.
export interface PivotLookups {
  epics: Map<number, string>
  sprints: Map<number, string>
  assignees: Map<number, string>
}

const NONE: Record<PivotDimension, string> = { status: 'No status', epic: 'No epic', sprint: 'No sprint', assignee: 'Unassigned' }

// The (stable key, label) a task falls under for a dimension.
export function pivotGroup(task: Task, dimension: PivotDimension, lookups: PivotLookups): { key: string; label: string } {
  const named = (id: number | null | undefined, names: Map<number, string>) =>
    id != null && names.has(id) ? { key: String(id), label: names.get(id) as string } : { key: 'none', label: NONE[dimension] }
  switch (dimension) {
    case 'status': return { key: task.status, label: STATUS_LABEL[task.status] }
    case 'epic': return named(task.epic_id, lookups.epics)
    case 'sprint': return named(task.sprint_id, lookups.sprints)
    case 'assignee': return named(task.assignee_id, lookups.assignees)
  }
}

export interface PivotTable {
  rows: { key: string; label: string }[]
  columns: { key: string; label: string }[]
  // counts[rowKey][columnKey]
  counts: Record<string, Record<string, number>>
  rowTotals: Record<string, number>
  columnTotals: Record<string, number>
  total: number
}

// Counts tasks by one dimension down the side and another across the top, with
// totals. Status groups keep board order; other groups appear in order of first
// use, with the "none" group last.
export function pivotTasks(tasks: Task[], rowDim: PivotDimension, colDim: PivotDimension, lookups: PivotLookups): PivotTable {
  const rows = new Map<string, string>()
  const columns = new Map<string, string>()
  const counts: PivotTable['counts'] = {}
  const rowTotals: Record<string, number> = {}
  const columnTotals: Record<string, number> = {}

  tasks.forEach((task) => {
    const r = pivotGroup(task, rowDim, lookups)
    const c = pivotGroup(task, colDim, lookups)
    rows.set(r.key, r.label)
    columns.set(c.key, c.label)
    counts[r.key] ??= {}
    counts[r.key][c.key] = (counts[r.key][c.key] ?? 0) + 1
    rowTotals[r.key] = (rowTotals[r.key] ?? 0) + 1
    columnTotals[c.key] = (columnTotals[c.key] ?? 0) + 1
  })

  const order = (dim: PivotDimension, map: Map<string, string>) => {
    const entries = [...map].map(([key, label]) => ({ key, label }))
    if (dim === 'status') return entries.sort((a, b) => ['backlog', 'todo', 'in_progress', 'in_review', 'done'].indexOf(a.key) - ['backlog', 'todo', 'in_progress', 'in_review', 'done'].indexOf(b.key))
    return entries.sort((a, b) => (a.key === 'none' ? 1 : b.key === 'none' ? -1 : 0))
  }

  return { rows: order(rowDim, rows), columns: order(colDim, columns), counts, rowTotals, columnTotals, total: tasks.length }
}
