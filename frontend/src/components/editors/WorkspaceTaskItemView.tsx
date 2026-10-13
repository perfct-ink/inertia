import { useState } from 'react'
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from '@tiptap/react'
import { format, parseISO } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { useTasks, useUpdateTask } from '@/api/tasks'
import { Button, Input } from '@/components/ui'

const STATUS_DOT: Record<string, string> = {
  backlog: 'bg-zinc-400',
  todo: 'bg-zinc-500',
  in_progress: 'bg-blue-500',
  in_review: 'bg-yellow-500',
  done: 'bg-green-500',
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
        className="self-start text-xs text-muted-foreground bg-transparent border-b border-input outline-none"
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
      className={`self-start flex items-center gap-1 text-xs shrink-0 hover:text-foreground ${dueDate ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}
    >
      <CalendarDays className="w-3 h-3" />
      {dueDate && format(parseISO(dueDate), 'MMM d')}
    </Button>
  )
}

export default function WorkspaceTaskItemView({ node }: NodeViewProps) {
  const { data: tasks = [] } = useTasks()
  const taskId = node.attrs.taskId as number | null
  const task = tasks.find((t) => t.id === taskId)
  const status = task?.status ?? 'backlog'
  const dotClass = STATUS_DOT[status] ?? 'bg-zinc-400'

  return (
    <NodeViewWrapper as="li" className="flex items-start gap-2 my-0.5">
      <span
        className={`w-2 h-2 rounded-full mt-[0.4rem] shrink-0 ${dotClass} ${!taskId ? 'opacity-40' : ''}`}
        title={task ? `Status: ${status.replace('_', ' ')}` : 'Unsaved task'}
      />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
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
