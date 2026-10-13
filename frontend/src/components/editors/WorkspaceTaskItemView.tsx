import { useState } from 'react'
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react'
import { format, parseISO } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { useTasks, useUpdateTask } from '@/api/tasks'
import { Button, Input } from '@/components/ui'
import './WorkspaceTaskItemView.scss'

const STATUS_DOT: Record<string, string> = {
  backlog: 'task_item-dot--backlog',
  todo: 'task_item-dot--todo',
  in_progress: 'task_item-dot--in_progress',
  in_review: 'task_item-dot--in_review',
  done: 'task_item-dot--done',
}

// Lets a task item written inline in a document (a product requirements doc,
// say) carry a due date without leaving the editor — the same due_date field
// TasksScreen/CalendarView already read, just editable from here too.
function DueDateControl({ taskId, dueDate }: { taskId: number; dueDate: string | null }) {
  const [editing, setEditing] = useState(false)
  const updateTask = useUpdateTask()

  if (editing) {
    return (
      <Input
        type="date"
        autoFocus
        defaultValue={dueDate ?? ''}
        contentEditable={false}
        className="task_item-due_input"
        onChange={(e) => { updateTask.mutate({ id: taskId, due_date: e.target.value || null }); setEditing(false) }}
        onBlur={() => setEditing(false)}
      />
    )
  }

  return (
    <Button
      onClick={() => setEditing(true)}
      contentEditable={false}
      title={dueDate ? `Due ${dueDate}` : 'Set a due date'}
      className={`task_item-due_button ${dueDate ? '' : 'task_item-due_button--empty'}`}
    >
      <CalendarDays className="task_item-due_icon" />
      {dueDate && format(parseISO(dueDate), 'MMM d')}
    </Button>
  )
}

export default function WorkspaceTaskItemView({ node }: NodeViewProps) {
  const { data: tasks = [] } = useTasks()
  const taskId = node.attrs.taskId as number | null
  const task = tasks.find((t) => t.id === taskId)
  const status = task?.status ?? 'backlog'
  const dotClass = STATUS_DOT[status] ?? 'task_item-dot--backlog'

  return (
    <NodeViewWrapper as="li" className="view-task_item">
      <span
        className={`task_item-dot ${dotClass} ${!taskId ? 'task_item-dot--unsaved' : ''}`}
        title={task ? `Status: ${status.replace('_', ' ')}` : 'Unsaved task'}
      />
      <div className="task_item-body">
        <NodeViewContent as="div" />
        {/* Only once the item has synced to a real Task (see DocumentScreen.
            tsx's syncTaskNodes) — there's nothing to attach a date to
            before that. Nested inside the same flex-1 column as the text
            (not a sibling of it) so it sits right under the task instead of
            at the far right edge of the whole editor. */}
        {taskId && <DueDateControl taskId={taskId} dueDate={task?.due_date ?? null} />}
      </div>
    </NodeViewWrapper>
  )
}
