import type { BoardStatuses } from '@/data/task_status'
import type { CsvCell } from '@/util/csv'
import type { Epic, Milestone, Sprint, Task, WorkspaceMember } from '@/types'
import { KIND_LABEL, kindOf, priorityLabel } from '@/data/task'

// Names to show for the ids a task points at, and the status labels of the
// board it is exported from (the labels people see on screen, not the codes).
export interface TaskExportLookups {
  statuses: BoardStatuses
  epics: Pick<Epic, 'id' | 'title'>[]
  sprints: Pick<Sprint, 'id' | 'title'>[]
  milestones: Pick<Milestone, 'id' | 'title'>[]
  members: Pick<WorkspaceMember, 'user_id' | 'user'>[]
}

export const TASK_EXPORT_HEADERS = [
  'ID', 'Title', 'Type', 'Status', 'Priority', 'Assignees', 'Start date', 'Due date', 'Epic', 'Sprint', 'Milestone',
  'Document', 'Estimate (hours)', 'Story points', 'Description',
]

// A header row and one row per task, for a report in a spreadsheet, as raw
// values (the file writer keeps text from running as a formula). Ids that are
// not in the lookups (a filtered-out epic, say) are left blank.
export function tasksToRows(tasks: Task[], lookups: TaskExportLookups): CsvCell[][] {
  const titleOf = (items: { id: number; title: string }[]) => {
    const byId = new Map(items.map((item) => [item.id, item.title]))
    return (id: number | null | undefined) => (id == null ? '' : byId.get(id) ?? '')
  }
  const epic = titleOf(lookups.epics)
  const sprint = titleOf(lookups.sprints)
  const milestone = titleOf(lookups.milestones)
  const memberName = new Map(lookups.members.map((member) => [member.user_id, member.user.name]))
  const assignees = (task: Task) => (task.assignee_ids ?? []).flatMap((id) => memberName.get(id) ?? []).join('; ')
  return [
    TASK_EXPORT_HEADERS,
    ...tasks.map((task): CsvCell[] => [
      task.id,
      task.title,
      KIND_LABEL[kindOf(task)],
      lookups.statuses[task.status]?.label ?? task.status,
      priorityLabel(task.priority) ?? '',
      assignees(task),
      task.start_date ?? '',
      task.due_date ?? '',
      epic(task.epic_id),
      sprint(task.sprint_id),
      milestone(task.milestone_id),
      task.document?.title ?? '',
      task.estimate_hours ?? '',
      task.story_points ?? '',
      task.description ?? '',
    ]),
  ]
}
