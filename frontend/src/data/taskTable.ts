import { pivotGroup, type PivotDimension, type PivotLookups } from '@/data/pivot'
import type { Task } from '@/types'

export type TaskColumn = 'title' | 'status' | 'start_date' | 'due_date' | 'assignee' | 'epic' | 'sprint'

export const TASK_COLUMNS: { key: TaskColumn; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'status', label: 'Status' },
  { key: 'start_date', label: 'Start' },
  { key: 'due_date', label: 'Due' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'epic', label: 'Epic' },
  { key: 'sprint', label: 'Sprint' },
]

export type GroupBy = 'none' | PivotDimension

export interface TaskTableOptions {
  sortKey: TaskColumn
  sortDir: 'asc' | 'desc'
  groupBy: GroupBy
  query: string
}

export interface TaskTableGroup { key: string; label: string | null; tasks: Task[] }

const STATUS_ORDER = ['backlog', 'todo', 'in_progress', 'in_review', 'done']

// The text a task sorts by for a column; blanks sort as the empty string.
function sortValue(task: Task, column: TaskColumn, lookups: PivotLookups): string {
  switch (column) {
    case 'title': return task.title.toLowerCase()
    case 'status': return String(STATUS_ORDER.indexOf(task.status)).padStart(2, '0')
    case 'start_date': return task.start_date ?? ''
    case 'due_date': return task.due_date ?? ''
    case 'assignee': return (task.assignee_id != null ? lookups.assignees.get(task.assignee_id) ?? '' : '').toLowerCase()
    case 'epic': return (task.epic_id != null ? lookups.epics.get(task.epic_id) ?? '' : '').toLowerCase()
    case 'sprint': return (task.sprint_id != null ? lookups.sprints.get(task.sprint_id) ?? '' : '').toLowerCase()
  }
}

// Filters by title, sorts, then groups: the rows of the task table. With no
// grouping there is one group with a null label. Blank values sort last in
// ascending order, and groups follow the order their first task appears in.
export function taskTableGroups(tasks: Task[], options: TaskTableOptions, lookups: PivotLookups): TaskTableGroup[] {
  const q = options.query.trim().toLowerCase()
  const filtered = q ? tasks.filter((t) => t.title.toLowerCase().includes(q)) : tasks
  const factor = options.sortDir === 'asc' ? 1 : -1
  const sorted = [...filtered].sort((a, b) => {
    const av = sortValue(a, options.sortKey, lookups)
    const bv = sortValue(b, options.sortKey, lookups)
    if (av === bv) return a.title.localeCompare(b.title)
    if (av === '') return 1
    if (bv === '') return -1
    return av.localeCompare(bv) * factor
  })
  if (options.groupBy === 'none') return [{ key: 'all', label: null, tasks: sorted }]
  const groups = new Map<string, TaskTableGroup>()
  sorted.forEach((task) => {
    const { key, label } = pivotGroup(task, options.groupBy as PivotDimension, lookups)
    const group = groups.get(key) ?? { key, label, tasks: [] }
    group.tasks.push(task)
    groups.set(key, group)
  })
  return [...groups.values()]
}

// The columns to show, in canonical order.
export function visibleColumns(hidden: Set<TaskColumn>): TaskColumn[] {
  return TASK_COLUMNS.map((c) => c.key).filter((k) => !hidden.has(k))
}
