import { useState } from 'react'
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, startOfMonth, startOfWeek, subMonths } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button, Input, classNames } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useEvents } from '@/api/events'
import { useTasks } from '@/api/tasks'
import { calendarItems } from '@/data/calendar'
import { usePageTitle } from '@/hooks/usePageTitle'
import './CalendarScreen.scss'

// A month calendar of the Space's tasks (on their due date) and events. Either
// can be hidden. On a phone it becomes a dated list.
export default function CalendarScreen() {
  usePageTitle('Calendar')
  const { data: tasks = [], isLoading } = useTasks()
  const { data: events = [] } = useEvents()
  const [month, setMonth] = useState(new Date())
  const [showTasks, setShowTasks] = useState(true)
  const [showEvents, setShowEvents] = useState(true)
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) })
  const items = calendarItems(tasks, events, showTasks, showEvents)
  const inMonth = days.filter((d) => isSameMonth(d, month))

  return (
    <WorkspaceLayout>
      <div className="view-calendar">
        <div className="calendar-header">
          <h1 className="calendar-title"><CalendarDays className="calendar-icon" aria-hidden="true" /> Calendar</h1>
          <label className="calendar-toggle"><Input type="checkbox" checked={showTasks} onChange={(e) => setShowTasks(e.target.checked)} /> Tasks</label>
          <label className="calendar-toggle"><Input type="checkbox" checked={showEvents} onChange={(e) => setShowEvents(e.target.checked)} /> Events</label>
          <div className="calendar-nav">
            <Button onClick={() => setMonth((m) => subMonths(m, 1))} aria-label="Previous month"><ChevronLeft className="calendar-icon" /></Button>
            <span className="calendar-month">{format(month, 'MMMM yyyy')}</span>
            <Button onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month"><ChevronRight className="calendar-icon" /></Button>
          </div>
        </div>
        {isLoading && <Loader2 className="calendar-icon" aria-label="Loading" />}

        <div className="calendar-agenda">
          {inMonth.every((d) => !items.get(format(d, 'yyyy-MM-dd'))) && <p className="calendar-empty">Nothing this month</p>}
          {inMonth.map((day) => {
            const list = items.get(format(day, 'yyyy-MM-dd'))
            if (!list) return null
            return (
              <div key={day.toISOString()} className="calendar-agenda-day">
                <strong className={classNames(isToday(day) && 'calendar-today')}>{format(day, 'EEE d')}</strong>
                {list.map((item) => <span key={item.key} className={`calendar-chip calendar-chip--${item.kind}${item.done ? ' calendar-chip--done' : ''}`}>{item.title}</span>)}
              </div>
            )
          })}
        </div>

        <div className="calendar-grid" role="grid" aria-label={format(month, 'MMMM yyyy')}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="calendar-weekday">{d}</div>)}
          {days.map((day) => {
            const list = items.get(format(day, 'yyyy-MM-dd')) ?? []
            return (
              <div key={day.toISOString()} className={classNames('calendar-cell', !isSameMonth(day, month) && 'calendar-cell--outside')} role="gridcell">
                <span className={classNames('calendar-day', isToday(day) && 'calendar-today')}>{format(day, 'd')}</span>
                {list.map((item) => <span key={item.key} className={`calendar-chip calendar-chip--${item.kind}${item.done ? ' calendar-chip--done' : ''}`} title={item.title}>{item.title}</span>)}
              </div>
            )
          })}
        </div>
      </div>
    </WorkspaceLayout>
  )
}
