import { Button, Modal } from '@/components/ui'
import { useAuthStore } from '@/store/auth'
import { useSetTaskFieldValue, useVoteTaskField } from '@/api/taskFields'
import { taskFormulas } from '@/data/taskField'
import type { Task, TaskField } from '@/types'
import { TaskFieldInput } from './TaskFieldInput'
import { useContext } from 'react'
import { TaskFieldPeople } from './taskFieldPeople'
import './TaskFields.scss'

// Edit every custom field of one task. Pass the task from the live task list
// so the controls follow the saved values; null keeps the dialog closed.
export function TaskFieldsDialog({ task, fields, onClose }: { task: Task | null; fields: TaskField[]; onClose: () => void }) {
  const userId = useAuthStore((s) => s.user?.id)
  const setValue = useSetTaskFieldValue()
  const vote = useVoteTaskField()
  const names = useContext(TaskFieldPeople)
  const people = [...(names ?? new Map<number, string>())].map(([id, name]) => ({ id, name }))
  const formulas = task ? taskFormulas(fields, task, names) : new Map()

  return (
    <Modal open={task !== null} title="Fields" description={task?.title} onClose={onClose} className="task_fields-modal">
      {task && (
        <div className="task_fields-dialog">
          {fields.map((field) => (
            <div key={field.id} className="task_fields-field">
              {/* Every control is labelled with the field's name itself. */}
              <span aria-hidden="true" className="task_fields-field_name">{field.name}</span>
              <TaskFieldInput
                field={field}
                task={task}
                userId={userId}
                onChange={(value) => setValue.mutate({ taskId: task.id, fieldId: field.id, value })}
                onVote={(voted) => vote.mutate({ taskId: task.id, fieldId: field.id, voted })}
                people={people}
                formula={formulas.get(field.id)}
              />
            </div>
          ))}
        </div>
      )}
      <div className="ui-modal-actions">
        <Button variant="secondary" onClick={onClose}>Done</Button>
      </div>
    </Modal>
  )
}
