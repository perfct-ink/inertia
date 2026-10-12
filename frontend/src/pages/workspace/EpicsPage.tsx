import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, X, Target, Loader2 } from 'lucide-react'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useEpics, useCreateEpic, useUpdateEpic, useDeleteEpic } from '@/api/epics'
import type { Epic } from '@/types'

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

function donePercent(epic: Epic) {
  return epic.tasks_count > 0 ? Math.round((epic.done_tasks_count / epic.tasks_count) * 100) : 0
}

// Appending a local midnight avoids new Date("YYYY-MM-DD") parsing as UTC
// midnight, which toLocaleDateString can then roll back a day in any
// timezone behind UTC.
function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

type ScheduledEpic = Epic & { start_date: string; target_date: string }

function TimelineBar({ epic, rangeStart, rangeEnd }: { epic: ScheduledEpic; rangeStart: number; rangeEnd: number }) {
  const start = new Date(`${epic.start_date}T00:00:00`).getTime()
  const end = new Date(`${epic.target_date}T00:00:00`).getTime()
  const span = rangeEnd - rangeStart || 1
  const left = ((start - rangeStart) / span) * 100
  const width = Math.max(((end - start) / span) * 100, 2)
  const percent = donePercent(epic)
  return (
    <div className="relative h-5">
      <div
        className="absolute h-full rounded-md bg-muted border border-input overflow-hidden"
        style={{ left: `${left}%`, width: `${width}%` }}
        title={`${epic.title}: ${formatDate(epic.start_date)} – ${formatDate(epic.target_date)} · ${percent}% done`}
      >
        <div className="h-full bg-primary/70" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

// Read-only: dates are edited from the List view's per-epic inputs. Only
// epics with both a start and target date can be placed on an axis; the
// rest are named below it instead of silently dropped.
function Timeline({ epics }: { epics: Epic[] }) {
  const scheduled = epics.filter((e): e is ScheduledEpic => Boolean(e.start_date && e.target_date))
  const unscheduled = epics.filter((e) => !e.start_date || !e.target_date)

  if (scheduled.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 gap-2 text-muted-foreground">
        <Target className="w-8 h-8 opacity-30" />
        <p className="text-sm">Set a start and target date on an epic to see it here</p>
      </div>
    )
  }

  const starts = scheduled.map((e) => new Date(`${e.start_date}T00:00:00`).getTime())
  const ends = scheduled.map((e) => new Date(`${e.target_date}T00:00:00`).getTime())
  const rangeStart = Math.min(...starts)
  const rangeEnd = Math.max(...ends)
  const span = rangeEnd - rangeStart || 1
  const now = Date.now()
  const todayPercent = now >= rangeStart && now <= rangeEnd ? ((now - rangeStart) / span) * 100 : null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3 text-xs text-muted-foreground">
        <div className="w-40 shrink-0" />
        <div className="flex-1 flex justify-between">
          <span>{formatDate(scheduled[starts.indexOf(rangeStart)].start_date)}</span>
          <span>{formatDate(scheduled[ends.indexOf(rangeEnd)].target_date)}</span>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="w-40 shrink-0 flex flex-col gap-3">
          {scheduled.map((epic) => (
            <p key={epic.id} className="text-sm truncate h-5 flex items-center" title={epic.title}>{epic.title}</p>
          ))}
        </div>
        <div className="relative flex-1 flex flex-col gap-3">
          {todayPercent !== null && (
            <div className="absolute top-0 bottom-0 w-px bg-red-400" style={{ left: `${todayPercent}%` }} title="Today" />
          )}
          {scheduled.map((epic) => (
            <TimelineBar key={epic.id} epic={epic} rangeStart={rangeStart} rangeEnd={rangeEnd} />
          ))}
        </div>
      </div>
      {unscheduled.length > 0 && (
        <p className="text-xs text-muted-foreground pt-3 border-t">
          Not scheduled: {unscheduled.map((e) => e.title).join(', ')}
        </p>
      )}
    </div>
  )
}

export default function EpicsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view') === 'timeline' ? 'timeline' : 'list'
  const { data: epics = [], isLoading } = useEpics()
  const createEpic = useCreateEpic()
  const updateEpic = useUpdateEpic()
  const deleteEpic = useDeleteEpic()
  const [adding, setAdding] = useState(false)
  const titleRef = useRef('')

  function commitAdd(value: string) {
    const title = value.trim()
    if (title) createEpic.mutate({ title })
    setAdding(false)
  }

  return (
    <WorkspaceLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-6 py-3 shrink-0 flex items-center gap-4">
          <h1 className="text-xl font-semibold">Epics</h1>
          <div className="flex gap-1">
            <button
              onClick={() => navigate('/epics?view=list')}
              className={`px-3 py-1 rounded-md text-sm ${view === 'list' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              List
            </button>
            <button
              onClick={() => navigate('/epics?view=timeline')}
              className={`px-3 py-1 rounded-md text-sm ${view === 'timeline' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Timeline
            </button>
          </div>
          <button
            onClick={() => setAdding(true)}
            className="ml-auto flex items-center gap-1.5 text-sm bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            New epic
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto py-6 px-6 flex flex-col gap-3">
            {adding && (
              <div className="bg-card border rounded-lg p-4">
                <input
                  autoFocus
                  placeholder="Epic title…"
                  className="w-full text-sm outline-none bg-transparent border-b border-input pb-1"
                  onChange={(e) => { titleRef.current = e.target.value }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitAdd(titleRef.current)
                    if (e.key === 'Escape') setAdding(false)
                  }}
                  onBlur={(e) => commitAdd(e.currentTarget.value)}
                />
              </div>
            )}

            {isLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && epics.length === 0 && !adding && (
              <div className="flex flex-col items-center py-12 gap-2 text-muted-foreground">
                <Target className="w-8 h-8 opacity-30" />
                <p className="text-sm">No epics yet</p>
              </div>
            )}

            {!isLoading && epics.length > 0 && view === 'timeline' && <Timeline epics={epics} />}

            {!isLoading && view === 'list' && epics.map((epic) => (
              <div
                key={epic.id}
                onClick={() => navigate(`/tasks?epic_id=${epic.id}`)}
                className="bg-card border rounded-lg p-4 flex flex-col gap-2 cursor-pointer hover:border-primary group"
              >
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium flex-1 truncate">{epic.title}</p>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {epic.done_tasks_count}/{epic.tasks_count} done
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteEpic.mutate(epic.id) }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="date"
                    value={epic.start_date ?? ''}
                    onChange={(e) => updateEpic.mutate({ id: epic.id, start_date: e.target.value || null })}
                    className="bg-transparent border-b border-input pb-0.5 outline-none cursor-pointer"
                  />
                  <span>&rarr;</span>
                  <input
                    type="date"
                    value={epic.target_date ?? ''}
                    onChange={(e) => updateEpic.mutate({ id: epic.id, target_date: e.target.value || null })}
                    className="bg-transparent border-b border-input pb-0.5 outline-none cursor-pointer"
                  />
                </div>
                <ProgressBar percent={donePercent(epic)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
