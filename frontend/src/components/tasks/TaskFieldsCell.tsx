import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button, classNames } from '@/components/ui'
import { useTaskFields } from '@/api/taskFields'
import { useWorkspace } from '@/api/workspace'
import { visibleFieldValues } from '@/data/taskField'
import type { Task } from '@/types'
import { TaskFieldValuesModal } from './TaskFieldValuesModal'
import './TaskFieldsCell.scss'

// A task's custom field values as small "Name value" tags, plus a button to
// edit them (for people who can edit tasks, once the Space has any fields).
// Renders nothing for a task with no values that can't be edited.
export function TaskFieldsCell({ task, readOnly, className }: { task: Task; readOnly?: boolean; className?: string }) {
  const { data: fields = [] } = useTaskFields()
  const { data: workspace } = useWorkspace()
  const [editing, setEditing] = useState(false)
  const shown = visibleFieldValues(fields, task)
  const canEdit = !readOnly && fields.length > 0 && !!workspace && workspace.role !== 'viewer'
  if (shown.length === 0 && !canEdit) return null

  return (
    <div className={classNames('task_fields_cell', className)}>
      {shown.map(({ field, text }) => (
        <span key={field.id} className="task_fields_cell-tag" title={`${field.name}: ${text}`}>
          <span className="task_fields_cell-name">{field.name}</span>
          <span className="task_fields_cell-value">{text}</span>
        </span>
      ))}
      {canEdit && (
        <Button
          variant="ghost"
          className="task_fields_cell-edit"
          aria-label={`Edit custom fields of ${task.title}`}
          title="Edit custom fields"
          onClick={() => setEditing(true)}
        >
          <SlidersHorizontal className="task_fields_cell-icon" />
        </Button>
      )}
      {editing && <TaskFieldValuesModal task={task} fields={fields} onClose={() => setEditing(false)} />}
    </div>
  )
}
