import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Loader2, UserCheck } from 'lucide-react'
import { Select } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useTasks, useUpdateTask } from '@/api/tasks'
import { DUE_BUCKET_LABEL, myWork } from '@/data/task'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useAuthStore } from '@/store/auth'
import type { Task } from '@/types'
import '../planning/PlanningScreen.scss'

const STATUSES: Task['status'][] = ['backlog', 'todo', 'in_progress', 'in_review', 'done']

// Everything assigned to me in this Space that isn't done, grouped by when it's
// due (overdue, today, this week, later, no date).
export default function MyWorkScreen() {
  usePageTitle('My work')
  const userId = useAuthStore((s) => s.user?.id)
  const { data: tasks = [], isLoading } = useTasks()
  const updateTask = useUpdateTask()
  const groups = userId == null ? [] : myWork(tasks, userId, format(new Date(), 'yyyy-MM-dd'))

  return (
    <WorkspaceLayout>
      <div className="view-planning view-my_work">
        <div className="planning-header">
          <h1 className="planning-title">My work</h1>
        </div>
        <div className="planning-body">
          <div className="planning-list">
            {isLoading && <Loader2 className="planning-spinner" aria-label="Loading" />}

            {!isLoading && groups.length === 0 && (
              <div className="planning-empty">
                <UserCheck className="planning-empty_icon" aria-hidden="true" />
                <p>Nothing is assigned to you right now.</p>
              </div>
            )}

            {groups.map(({ bucket, tasks: bucketTasks }) => (
              <section key={bucket} className="planning-card" aria-label={DUE_BUCKET_LABEL[bucket]}>
                <h2 className="planning-card-title">{DUE_BUCKET_LABEL[bucket]} <span className="planning-date">{bucketTasks.length}</span></h2>
                <ul>
                  {bucketTasks.map((task) => (
                    <li key={task.id} className="planning-card-dates">
                      <span>{task.title}</span>
                      {task.due_date && <span className="planning-date">{format(parseISO(task.due_date), 'MMM d')}</span>}
                      {task.document && <Link to={`/documents/${task.document.id}`} className="planning-initiative">{task.document.title}</Link>}
                      <Select
                        aria-label={`Status of ${task.title}`}
                        value={task.status}
                        onChange={(e) => updateTask.mutate({ id: task.id, status: e.target.value as Task['status'] })}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                      </Select>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
