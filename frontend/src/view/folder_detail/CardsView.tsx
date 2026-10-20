import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import type { Epic, Task } from '@/types'
import { taskCards } from '@/data/task'
import { todayISO } from '@/util/date'
import { ProgressBar } from '@/components/Timeline'
import './CardsView.scss'

const STATUS_LABEL: Record<Task['status'], string> = {
  backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done',
}

// A gallery of the folder's tasks as cards: title, status, due date, epic and
// subtask progress. Each card opens the document the task lives in.
export default function CardsView({ tasks, epics }: { tasks: Task[]; epics: Epic[] }) {
  const cards = taskCards(tasks, epics, todayISO())
  if (cards.length === 0) return <p className="cards_view-empty view-cards_view--empty">No tasks yet. Add a checklist item in a document to see it here.</p>
  return (
    <div className="view-cards_view" role="list" aria-label="Task cards">
      {cards.map(({ task, epicTitle, subtasks, overdue }) => (
        <Link key={task.id} to={`/documents/${task.document_id}`} role="listitem" className={`cards_view-card cards_view-card--${task.status}`}>
          <span className="cards_view-status">{STATUS_LABEL[task.status]}</span>
          <h2 className="cards_view-title">{task.title}</h2>
          {epicTitle && <span className="cards_view-epic">{epicTitle}</span>}
          {task.due_date && (
            <span className={overdue ? 'cards_view-due cards_view-due--overdue' : 'cards_view-due'}>
              {overdue ? 'Overdue · ' : 'Due '}{format(parseISO(task.due_date), 'MMM d')}
            </span>
          )}
          {subtasks.total > 0 && (
            <span className="cards_view-progress">
              <ProgressBar percent={Math.round((subtasks.done / subtasks.total) * 100)} />
              {subtasks.done}/{subtasks.total} subtasks
            </span>
          )}
        </Link>
      ))}
    </div>
  )
}
