import { format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import { ProgressBar } from '@/components/Timeline'
import { donePercent } from '@/data/schedule'
import type { Sprint } from '@/types'
import './SprintHeader.scss'

// The sprint a Workboard is scoped to: title, goal, dates and progress.
export default function SprintHeader({ sprint }: { sprint: Sprint }) {
  const dates = [sprint.start_date, sprint.end_date].filter(Boolean).map((d) => format(parseISO(d as string), 'MMM d'))
  return (
    <header className="sprint_header" aria-label={`Sprint ${sprint.title}`}>
      <div className="sprint_header-top">
        <h2 className="sprint_header-title">{sprint.title}</h2>
        <span className="sprint_header-status">{sprint.status}</span>
        {dates.length > 0 && <span className="sprint_header-dates">{dates.join(' → ')}</span>}
        <Link to="/sprints" className="sprint_header-link">All sprints</Link>
      </div>
      {sprint.goal && <p className="sprint_header-goal">{sprint.goal}</p>}
      <div className="sprint_header-progress">
        <ProgressBar percent={donePercent(sprint)} />
        <span>{sprint.done_tasks_count}/{sprint.tasks_count} tasks done</span>
      </div>
    </header>
  )
}
