import { fieldSummaries } from '@/data/taskField'
import type { Task, TaskField } from '@/types'
import './TaskFields.scss'

// Read-only chips for the custom fields a task has a value for. Shows nothing
// when the task has none.
export function TaskFieldChips({ fields, task }: { fields: TaskField[]; task: Task }) {
  const summaries = fieldSummaries(fields, task)
  if (summaries.length === 0) return null
  return (
    <ul className="task_fields-chips" aria-label="Fields">
      {summaries.map(({ field, text, spoken }) => (
        <li key={field.id} className="task_fields-chip">
          <span className="task_fields-chip_name">{field.name}</span>
          <span aria-hidden={spoken !== text || undefined} className="task_fields-chip_value">{text}</span>
          {spoken !== text && <span className="task_fields-visually_hidden">{spoken}</span>}
        </li>
      ))}
    </ul>
  )
}
