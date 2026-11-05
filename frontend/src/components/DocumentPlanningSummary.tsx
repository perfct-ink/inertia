import { format, parseISO } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { HealthBadge } from '@/components/ui'
import { ProgressBar } from '@/components/Timeline'
import { useEvents } from '@/api/events'
import { useInitiatives } from '@/api/initiatives'
import { useTasks } from '@/api/tasks'
import { planningSummary } from '@/data/planningSummary'
import type { Document } from '@/types'
import './DocumentPlanningSummary.scss'

// The plan at a glance, above the document: its initiative with health and
// dates, how far its tasks are, what is overdue, and the next events in its folder.
export default function DocumentPlanningSummary({ doc }: { doc: Document }) {
  const { data: tasks = [] } = useTasks({ document_id: doc.id })
  const { data: events = [] } = useEvents()
  const { data: initiatives = [] } = useInitiatives()
  const initiative = initiatives.find((i) => i.id === doc.initiative_id)
  const summary = planningSummary(tasks, events.filter((e) => e.folder_id === doc.folder_id), format(new Date(), 'yyyy-MM-dd'))
  const hasPlan = summary.tasksCount > 0 || summary.upcomingEvents.length > 0 || initiative

  if (!hasPlan) return null
  return (
    <section className="document_summary" aria-label="Plan">
      {initiative && (
        <div className="document_summary-item">
          <strong>{initiative.title}</strong>
          <HealthBadge health={initiative.health} />
          {(initiative.start_date || initiative.target_date) && (
            <span>{initiative.start_date ? format(parseISO(initiative.start_date), 'MMM d') : '…'} → {initiative.target_date ? format(parseISO(initiative.target_date), 'MMM d, yyyy') : '…'}</span>
          )}
        </div>
      )}
      {summary.tasksCount > 0 && (
        <div className="document_summary-item">
          <ProgressBar percent={summary.percent} />
          <span>{summary.doneTasksCount}/{summary.tasksCount} tasks done</span>
          {summary.overdueCount > 0 && <span className="document_summary-overdue">{summary.overdueCount} overdue</span>}
        </div>
      )}
      {summary.upcomingEvents.length > 0 && (
        <div className="document_summary-item">
          <CalendarDays className="document_summary-icon" aria-hidden="true" />
          {summary.upcomingEvents.map((e) => <span key={e.id}>{e.title} · {format(parseISO(e.date), 'MMM d')}</span>)}
        </div>
      )}
    </section>
  )
}
