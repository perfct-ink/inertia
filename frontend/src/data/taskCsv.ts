import type { Epic, Milestone, Sprint, Task } from '@/types'
import { neutralizeFormula, type CsvCell } from '@/util/csv'
import { TASK_STATUS_LABELS } from '@/data/task'

// Titles to show for the ids a task points at.
export interface TaskCsvLookups {
  epics: Pick<Epic, 'id' | 'title'>[]
  sprints: Pick<Sprint, 'id' | 'title'>[]
  milestones: Pick<Milestone, 'id' | 'title'>[]
}

export const TASK_CSV_HEADERS = ['ID', 'Title', 'Status', 'Start date', 'Due date', 'Epic', 'Sprint', 'Milestone', 'Document', 'Description']

// A header row and one row per task, for a report in a spreadsheet. Ids that
// are not in the lookups (a filtered-out epic, say) are left blank.
export function tasksToCsvRows(tasks: Task[], lookups: TaskCsvLookups): CsvCell[][] {
  const titleOf = (items: { id: number; title: string }[]) => {
    const byId = new Map(items.map((item) => [item.id, item.title]))
    return (id: number | null | undefined) => {
      const title = id == null ? undefined : byId.get(id)
      return title === undefined ? '' : neutralizeFormula(title)
    }
  }
  const epic = titleOf(lookups.epics)
  const sprint = titleOf(lookups.sprints)
  const milestone = titleOf(lookups.milestones)
  return [
    TASK_CSV_HEADERS,
    ...tasks.map((task): CsvCell[] => [
      task.id,
      neutralizeFormula(task.title),
      TASK_STATUS_LABELS[task.status] ?? task.status,
      task.start_date ?? '',
      task.due_date ?? '',
      epic(task.epic_id),
      sprint(task.sprint_id),
      milestone(task.milestone_id),
      task.document ? neutralizeFormula(task.document.title) : '',
      neutralizeFormula(task.description ?? ''),
    ]),
  ]
}
