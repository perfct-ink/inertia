import { Button, Input, classNames } from '@/components/ui'
import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus, X, Flag, Trophy, ChevronLeft, ChevronRight,
  LayoutList, Calendar, Loader2,
} from 'lucide-react'
import {
  format, isPast, isToday, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths,
} from 'date-fns'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import {
  useEvents, useCreateEvent, useDeleteEvent,
  useAddTaskToEvent, useRemoveTaskFromEvent,
} from '@/api/events'
import { useTasks } from '@/api/tasks'
import type { WorkspaceEvent, Task } from '@/types'
import './EventsScreen.scss'
import { usePageTitle } from '@/hooks/usePageTitle'

function StatusDot({ status }: { status: Task['status'] }) {
  return <span className={`events-status events-status--${status}`} />
}

function EventTypeIcon({ type, size, tinted }: {
  type: WorkspaceEvent['event_type']
  size?: 'xs' | 'sm'
  tinted?: boolean
}) {
  const className = classNames(
    'events-icon',
    size && `events-icon--${size}`,
    tinted && `events-icon--${type === 'deadline' ? 'deadline' : 'milestone'}`,
  )
  return type === 'deadline' ? <Flag className={className} /> : <Trophy className={className} />
}

function dateBadgeClass(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  if (isPast(d) && !isToday(d)) return 'events-date--overdue'
  if (isToday(d)) return 'events-date--today'
  return 'events-date--upcoming'
}

// ── Task picker ───────────────────────────────────────────────────────────────

function TaskPicker({ availableTasks, onAdd, onClose }: {
  availableTasks: Task[]
  onAdd: (task: Task) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const filtered = availableTasks.filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="events-picker">
      <div className="events-picker-search">
        <Input
          autoFocus
          placeholder="Search tasks…"
          className="events-picker_input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onClose()}
        />
      </div>
      <div className="events-picker-list">
        {filtered.length === 0 && <p className="events-muted events-picker-empty">No tasks found</p>}
        {filtered.map((task) => (
          <Button
            key={task.id}
            onClick={() => { onAdd(task); onClose() }}
            className="events-picker_item"
          >
            <StatusDot status={task.status} />
            <span>{task.title}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}

// ── Right sidebar ─────────────────────────────────────────────────────────────

type SidebarState =
  | { mode: 'new'; defaultDate: string }
  | { mode: 'event'; event: WorkspaceEvent }
  | null

function EventSidebar({ state, onClose }: { state: SidebarState; onClose: () => void }) {
  const [visible, setVisible] = useState(false)
  const lastState = useRef<SidebarState>(null)
  if (state) lastState.current = state

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (state) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [!!state])

  useEffect(() => {
    if (state) {
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [!!state])

  const navigate = useNavigate()
  const createEvent = useCreateEvent()
  const deleteEvent = useDeleteEvent()
  const addTask = useAddTaskToEvent()
  const removeTask = useRemoveTaskFromEvent()
  const { data: allTasks = [] } = useTasks()
  const [showPicker, setShowPicker] = useState(false)

  // new-event form state
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(state?.mode === 'new' ? state.defaultDate : '')
  const [type, setType] = useState<'deadline' | 'milestone'>('milestone')
  const [hasTime, setHasTime] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (state?.mode === 'new') {
      setTitle('')
      setDate(state.defaultDate)
      setType('milestone')
      setHasTime(false)
      setStartTime('')
      setEndTime('')
      setTimeout(() => titleInputRef.current?.focus(), 20)
    }
  }, [state?.mode === 'new' ? state.defaultDate : null])

  const rendered = state ?? lastState.current
  if (!rendered && !visible) return null

  const sidebarClass = classNames('events-sidebar', visible && 'events-sidebar--visible')

  if (!state) return null

  if (rendered?.mode === 'new') {
    function submit(e: React.FormEvent) {
      e.preventDefault()
      if (!title.trim() || !date) return
      createEvent.mutate({
        title: title.trim(),
        date,
        event_type: type,
        start_time: hasTime && startTime ? startTime : undefined,
        end_time: hasTime && endTime ? endTime : undefined,
      })
      onClose()
    }

    return (
      <aside className={sidebarClass}>
        <div className="events-sidebar-header">
          <span className="events-sidebar-name">New Event</span>
          <Button onClick={onClose} aria-label="Close" className="events-close">
            <X className="events-icon" />
          </Button>
        </div>
        <form onSubmit={submit} className="events-form">
          <Input
            ref={titleInputRef}
            autoFocus
            placeholder="Event title"
            className="events-field_input events-field_input--title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="events-form-field">
            <label className="events-muted">Date</label>
            <Input
              type="date"
              required
              className="events-field_input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="events-form-field events-form-field--wide">
            <label className="events-form-checkbox">
              <Input
                type="checkbox"
                checked={hasTime}
                onChange={(e) => setHasTime(e.target.checked)}
                className="events-check"
              />
              <span className="events-muted">Add time</span>
            </label>
            {hasTime && (
              <div className="events-form-row">
                <Input
                  type="time"
                  className="events-field_input events-field_input--time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="Start"
                />
                <span className="events-muted">to</span>
                <Input
                  type="time"
                  className="events-field_input events-field_input--time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="End"
                />
              </div>
            )}
          </div>
          <div className="events-form-field">
            <label className="events-muted">Type</label>
            <div className="events-form-types">
              {(['milestone', 'deadline'] as const).map((t) => (
                <Button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={classNames('events-type_option', type === t && 'events-type_option--active')}
                >
                  <EventTypeIcon type={t} size="xs" />
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          <Button variant="primary"
            type="submit"
            className="events-create"
          >
            Create
          </Button>
        </form>
      </aside>
    )
  }

  // mode === 'event'
  const event = (rendered as { mode: 'event'; event: WorkspaceEvent }).event
  const linkedIds = new Set(event.tasks.map((t) => t.id))
  const available = allTasks.filter((t) => !linkedIds.has(t.id))

  return (
    <aside className={sidebarClass}>
      <div className="events-sidebar-header">
        <div className="events-sidebar-heading">
          <EventTypeIcon type={event.event_type} tinted />
          <span className="events-sidebar-name">{event.title}</span>
        </div>
        <Button onClick={onClose} aria-label="Close" className="events-close events-close--end">
          <X className="events-icon" />
        </Button>
      </div>

      <div className="events-sidebar-body">
        {/* Date & time */}
        <div>
          <p className="events-sidebar-label">Date</p>
          <p className={classNames('events-sidebar-date', dateBadgeClass(event.date))}>
            {format(new Date(event.date + 'T00:00:00'), 'MMMM d, yyyy')}
          </p>
          {(event.start_time || event.end_time) && (
            <p className="events-muted events-sidebar-time">
              {event.start_time ?? '—'}{event.end_time ? ` → ${event.end_time}` : ''}
            </p>
          )}
        </div>

        {/* Type */}
        <div>
          <p className="events-sidebar-label">Type</p>
          <div className="events-sidebar-type">
            <EventTypeIcon type={event.event_type} size="sm" tinted />
            <span className="events-sidebar-value">{event.event_type}</span>
          </div>
        </div>

        {/* Tasks */}
        <div>
          <p className="events-sidebar-label events-sidebar-label--tasks">Tasks</p>
          <div className="events-sidebar-tasks">
            {event.tasks.map((task) => (
              <div key={task.id} className="events-task">
                <StatusDot status={task.status} />
                <span
                  className="events-task-title"
                  onClick={() => task.document_id && navigate(`/documents/${task.document_id}`)}
                >
                  {task.title}
                </span>
                <Button
                  onClick={() => removeTask.mutate({ eventId: event.id, taskId: task.id })}
                  aria-label="Remove task"
                  className="events-task_remove"
                >
                  <X className="events-icon events-icon--xs" />
                </Button>
              </div>
            ))}
            {event.tasks.length === 0 && (
              <p className="events-muted">No tasks linked</p>
            )}
          </div>
          <div className="events-sidebar-add">
            <Button
              onClick={() => setShowPicker(!showPicker)}
              className="events-add_task"
            >
              <Plus className="events-icon events-icon--sm" />
              Add task
            </Button>
            {showPicker && (
              <TaskPicker
                availableTasks={available}
                onAdd={(task) => addTask.mutate({ eventId: event.id, taskId: task.id })}
                onClose={() => setShowPicker(false)}
              />
            )}
          </div>
        </div>
      </div>

      <div className="events-sidebar-footer">
        <Button variant="secondary"
          onClick={() => { deleteEvent.mutate(event.id); onClose() }}
          className="events-delete"
        >
          Delete event
        </Button>
      </div>
    </aside>
  )
}

// ── Month view ────────────────────────────────────────────────────────────────

function MonthView({ events, onDayClick, onEventClick, selectedDate }: {
  events: WorkspaceEvent[]
  onDayClick: (dateStr: string) => void
  onEventClick: (event: WorkspaceEvent) => void
  selectedDate?: string
}) {
  const today = new Date()
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 0 }),
  })

  const byDate: Record<string, WorkspaceEvent[]> = {}
  for (const ev of events) {
    if (!byDate[ev.date]) byDate[ev.date] = []
    byDate[ev.date].push(ev)
  }

  return (
    <div className="events-month">
      <div className="events-month-nav">
        <Button
          onClick={() => setMonth((m) => subMonths(m, 1))}
          aria-label="Previous month"
          className="events-nav_button"
        >
          <ChevronLeft className="events-icon" />
        </Button>
        <span className="events-month-label">{format(month, 'MMMM yyyy')}</span>
        <Button
          onClick={() => setMonth((m) => addMonths(m, 1))}
          aria-label="Next month"
          className="events-nav_button"
        >
          <ChevronRight className="events-icon" />
        </Button>
        <Button
          onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
          className="events-today"
        >
          Today
        </Button>
      </div>

      <div className="events-month-weekdays">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="events-month-weekday">{d}</div>
        ))}
      </div>

      <div className="events-month-grid">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayEvents = byDate[key] ?? []
          const inMonth = isSameMonth(day, month)
          const isT = isToday(day)
          const isSelected = key === selectedDate

          return (
            <div
              key={key}
              onClick={() => onDayClick(key)}
              className={classNames(
                'events-day',
                !inMonth && 'events-day--outside',
                isSelected && 'events-day--selected',
              )}
            >
              <span className={classNames(
                'events-day-number',
                isT ? 'events-day-number--today' : isSelected && 'events-day-number--selected',
              )}>
                {format(day, 'd')}
              </span>
              <div className="events-day-events">
                {dayEvents.slice(0, 3).map((ev) => (
                  <Button
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev) }}
                    className={`events-chip events-chip--${ev.event_type === 'deadline' ? 'deadline' : 'milestone'}`}
                  >
                    {ev.title}
                  </Button>
                ))}
                {dayEvents.length > 3 && (
                  <span className="events-muted events-more">+{dayEvents.length - 3} more</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── List view ─────────────────────────────────────────────────────────────────

function ListView({ events, onEventClick }: {
  events: WorkspaceEvent[]
  onEventClick: (event: WorkspaceEvent) => void
}) {
  const upcoming = events.filter((e) => !isPast(new Date(e.date + 'T00:00:00')) || isToday(new Date(e.date + 'T00:00:00')))
  const past = events.filter((e) => isPast(new Date(e.date + 'T00:00:00')) && !isToday(new Date(e.date + 'T00:00:00')))

  function EventRow({ event, dim }: { event: WorkspaceEvent; dim?: boolean }) {
    return (
      <Button
        onClick={() => onEventClick(event)}
        className={classNames('events-row', dim && 'events-row--dim')}
      >
        <EventTypeIcon type={event.event_type} tinted />
        <span className="events-row-title">{event.title}</span>
        {event.tasks.length > 0 && (
          <span className="events-muted events-row-count">{event.tasks.length} task{event.tasks.length !== 1 ? 's' : ''}</span>
        )}
        <span className={classNames('events-row-date', dateBadgeClass(event.date))}>
          {format(new Date(event.date + 'T00:00:00'), 'MMM d, yyyy')}
        </span>
      </Button>
    )
  }

  return (
    <div className="events-list">
      <div className="events-list-inner">
        {upcoming.length === 0 && past.length === 0 && (
          <div className="events-empty">
            <div className="events-empty-text">
              <p className="events-empty-title">No events yet</p>
              <p className="events-empty-hint">Create an event to get started.</p>
            </div>
          </div>
        )}
        {upcoming.length > 0 && (
          <section>
            <h2 className="events-list-heading">Upcoming</h2>
            <div className="events-list-rows">
              {upcoming.map((e) => <EventRow key={e.id} event={e} />)}
            </div>
          </section>
        )}
        {past.length > 0 && (
          <section>
            <h2 className="events-list-heading">Past</h2>
            <div className="events-list-rows">
              {past.map((e) => <EventRow key={e.id} event={e} dim />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EventsScreen() {
  usePageTitle('Events')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { data: events = [], isLoading } = useEvents()
  const view = searchParams.get('view') === 'month' ? 'month' : 'list'
  const [sidebar, setSidebar] = useState<SidebarState>(null)

  function todayISO() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  function openNew(defaultDate?: string) {
    setSidebar({ mode: 'new', defaultDate: defaultDate ?? todayISO() })
  }

  function openEvent(event: WorkspaceEvent) {
    setSidebar({ mode: 'event', event })
  }

  useEffect(() => {
    if (searchParams.get('new') === '1') openNew()
  }, [searchParams])

  // Keep sidebar event data fresh when events refetch
  if (sidebar?.mode === 'event') {
    const fresh = events.find((e) => e.id === sidebar.event.id)
    if (fresh && fresh !== sidebar.event) {
      setSidebar({ mode: 'event', event: fresh })
    }
  }

  return (
    <WorkspaceLayout>
      <div className="view-events">
        <div className="events-main">
          {/* Header */}
          <div className="events-header">
            <h1 className="events-title">Events</h1>
            <div className="events-switcher">
              <Button
                onClick={() => navigate('/events?view=list')}
                className={classNames('events-switch', view === 'list' && 'events-switch--active')}
              >
                <LayoutList className="events-icon events-icon--sm" />
                List
              </Button>
              <Button
                onClick={() => navigate('/events?view=month')}
                className={classNames('events-switch', view === 'month' && 'events-switch--active')}
              >
                <Calendar className="events-icon events-icon--sm" />
                Month
              </Button>
            </div>
            <Button variant="primary"
              onClick={() => openNew()}
              className="events-new"
            >
              <Plus className="events-icon" />
              New event
            </Button>
          </div>

          {isLoading && (
            <div className="events-loading">
              <Loader2 className="events-icon events-icon--lg events-icon--spin" />
            </div>
          )}

          {!isLoading && view === 'month' && (
            <MonthView
              events={events}
              onDayClick={(date) => openNew(date)}
              onEventClick={openEvent}
              selectedDate={
                sidebar?.mode === 'new' ? sidebar.defaultDate :
                sidebar?.mode === 'event' ? sidebar.event.date : undefined
              }
            />
          )}

          {!isLoading && view === 'list' && (
            <ListView events={events} onEventClick={openEvent} />
          )}
        </div>

        <EventSidebar state={sidebar} onClose={() => setSidebar(null)} />
      </div>
    </WorkspaceLayout>
  )
}
