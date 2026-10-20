import { useState } from 'react'
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react'
import { format, parseISO } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { useTasks, useUpdateTask } from '@/api/tasks'
import { useWorkspaceMembers } from '@/api/workspaces'
import { useWorkspaceStore } from '@/store/workspaces'
import { Button, Input, Select } from '@/components/ui'
import { statusForCheckbox } from '@/data/taskLine'
import type { Task } from '@/types'
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

const STATUS_OPTIONS: Task['status'][] = ['backlog', 'todo', 'in_progress', 'in_review', 'done']

// Status, assignee and start date for a synced line; saves through the same
// task update call as the due date. Failed saves surface via the api interceptor.
function TaskFieldControls({ task }: { task: Task }) {
  const updateTask = useUpdateTask()
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId) ?? 0
  const { data: members = [] } = useWorkspaceMembers(workspaceId)
  const save = (data: Partial<Task>) => updateTask.mutate({ id: task.id, ...data })

  return (
    <div className="task_item-fields" contentEditable={false}>
      <Select
        aria-label="Status"
        value={task.status}
        onChange={(e) => save({ status: e.target.value as Task['status'] })}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>{s.replace('_', ' ')}</option>
        ))}
      </Select>
      <Select
        aria-label="Assignee"
        value={task.assignee_id ?? ''}
        onChange={(e) => save({ assignee_id: e.target.value ? Number(e.target.value) : null })}
      >
        <option value="">Unassigned</option>
        {members.map((m) => (
          <option key={m.user_id} value={m.user_id}>{m.user.name}</option>
        ))}
      </Select>
      <Input
        type="date"
        aria-label="Start date"
        value={task.start_date ?? ''}
        onChange={(e) => save({ start_date: e.target.value || null })}
      />
    </div>
  )
}

export default function WorkspaceTaskItemView({ node, editor, getPos }: NodeViewProps) {
  const { data: tasks = [], isSuccess } = useTasks()
  const updateTask = useUpdateTask()
  const taskId = node.attrs.taskId as number | null
  const task = tasks.find((t) => t.id === taskId)
  const status = task?.status ?? 'backlog'
  const dotClass = STATUS_DOT[status] ?? 'task_item-dot--backlog'
  // The line points at a task that no longer exists (deleted elsewhere).
  const taskGone = Boolean(taskId) && isSuccess && !task

  function removeLine() {
    const pos = getPos()
    if (typeof pos === 'number') editor.view.dispatch(editor.state.tr.delete(pos, pos + node.nodeSize))
  }

  function unlink() {
    const pos = getPos()
    if (typeof pos === 'number') editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { taskId: null }))
  }

  return (
    <NodeViewWrapper as="li" className="view-task_item">
      {task ? (
        <Input
          type="checkbox"
          aria-label={`Mark “${task.title}” done`}
          checked={task.status === 'done'}
          contentEditable={false}
          onChange={(e) => updateTask.mutate({ id: task.id, status: statusForCheckbox(e.target.checked) })}
          className="task_item-check"
        />
      ) : (
        <span
          className={`task_item-dot ${dotClass} ${!taskId ? 'task_item-dot--unsaved' : ''}`}
          title={taskGone ? 'This task was deleted' : 'Unsaved task'}
        />
      )}
      <div className="task_item-body">
        <NodeViewContent as="div" />
        {taskGone && (
          <div className="task_item-gone" contentEditable={false}>
            <span>This task was deleted.</span>
            <Button onClick={unlink}>Make a new task</Button>
            <Button onClick={removeLine}>Remove line</Button>
          </div>
        )}
        {/* Only once the item has synced to a real Task (see DocumentScreen.
            tsx's syncTaskNodes) — there's nothing to attach a date to
            before that. Nested inside the same flex-1 column as the text
            (not a sibling of it) so it sits right under the task instead of
            at the far right edge of the whole editor. */}
        {taskId && task && <DueDateControl taskId={taskId} dueDate={task.due_date ?? null} />}
        {task && <TaskFieldControls task={task} />}
      </div>
    </NodeViewWrapper>
  )
}
