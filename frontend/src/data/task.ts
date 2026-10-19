import type { Task } from '@/types'

export interface TaskNode extends Task { children: TaskNode[] }

// Nests tasks under their parent task to any depth. A task whose parent is
// not in the list (e.g. filtered out) becomes a root.
export function buildTaskTree(tasks: Task[]): TaskNode[] {
  const byId = new Map<number, TaskNode>(tasks.map((t) => [t.id, { ...t, children: [] }]))
  const roots: TaskNode[] = []
  byId.forEach((node) => {
    const parent = node.parent_id != null ? byId.get(node.parent_id) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  })
  return roots
}

export type DueBucket = 'overdue' | 'today' | 'this_week' | 'later' | 'no_date'

export const DUE_BUCKET_LABEL: Record<DueBucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  this_week: 'This week',
  later: 'Later',
  no_date: 'No date',
}

const DUE_BUCKETS: DueBucket[] = ['overdue', 'today', 'this_week', 'later', 'no_date']

// Which bucket a due date (yyyy-MM-dd) falls in relative to `today`; "this week"
// is the next six days after today.
export function dueBucket(dueDate: string | null, today: string): DueBucket {
  if (!dueDate) return 'no_date'
  if (dueDate < today) return 'overdue'
  if (dueDate === today) return 'today'
  const [y, m, d] = today.split('-').map(Number)
  const weekEnd = new Date(Date.UTC(y, m - 1, d + 6)).toISOString().slice(0, 10)
  return dueDate <= weekEnd ? 'this_week' : 'later'
}

// A person's open tasks grouped by due date, soonest first within each group;
// empty groups are left out and finished tasks are skipped.
export function myWork(tasks: Task[], userId: number, today: string): { bucket: DueBucket; tasks: Task[] }[] {
  const mine = tasks.filter((t) => t.assignee_id === userId && t.status !== 'done')
  return DUE_BUCKETS
    .map((bucket) => ({
      bucket,
      tasks: mine
        .filter((t) => dueBucket(t.due_date, today) === bucket)
        .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '') || a.title.localeCompare(b.title)),
    }))
    .filter((group) => group.tasks.length > 0)
}
