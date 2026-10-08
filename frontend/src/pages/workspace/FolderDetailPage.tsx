import { Database } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  Loader2, ArrowLeft, ArrowRight, Archive, ArchiveRestore,
  LayoutList, Kanban as KanbanIcon, Calendar as CalendarIcon, GanttChart,
  ChevronLeft, ChevronRight, FileText, Table as TableIcon, LayoutDashboard,
} from 'lucide-react'
import {
  format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, eachMonthOfInterval, isSameMonth, isToday,
  addMonths, subMonths, differenceInCalendarDays,
} from 'date-fns'
import CreateItem from '@/components/CreateItem'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useFolderContents, useUpdateFolder } from '@/api/workspace'
import { useUpdateTask } from '@/api/tasks'
import type { Task, WorkspaceEvent, Epic } from '@/types'

const KANBAN_STATUSES: { key: Task['status']; label: string; dot: string }[] = [
  { key: 'todo', label: 'To Do', dot: 'bg-muted-foreground' },
  { key: 'in_progress', label: 'In Progress', dot: 'bg-blue-500' },
  { key: 'in_review', label: 'In Review', dot: 'bg-yellow-500' },
  { key: 'done', label: 'Done', dot: 'bg-green-500' },
]

const NEXT_STATUS: Record<Task['status'], Task['status'] | null> = {
  backlog: 'todo', todo: 'in_progress', in_progress: 'in_review', in_review: 'done', done: null,
}

const STATUS_LABEL: Record<Task['status'], string> = {
  backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done',
}

const STATUS_DOT: Record<Task['status'], string> = {
  backlog: 'bg-zinc-400', todo: 'bg-zinc-500', in_progress: 'bg-blue-500', in_review: 'bg-yellow-500', done: 'bg-green-500',
}

const VIEWS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'board', label: 'Board', icon: KanbanIcon },
  { key: 'list', label: 'List', icon: LayoutList },
  { key: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { key: 'gantt', label: 'Gantt', icon: GanttChart },
] as const

// ── Board — no drag, just a "move to next status" arrow. The full
// drag-and-drop board lives on TasksPage; this is deliberately simpler
// since it's one of four views sharing this page. ──────────────────────────

function BoardView({ tasks, onAdvance }: { tasks: Task[]; onAdvance: (task: Task) => void }) {
  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="flex gap-4 h-full min-w-max">
        {KANBAN_STATUSES.map(({ key, label, dot }) => {
          const colTasks = tasks.filter((t) => t.status === key)
          return (
            <div key={key} className="w-64 flex flex-col shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-xs text-muted-foreground">{colTasks.length}</span>
              </div>
              <div className="flex flex-col gap-2 flex-1 min-h-[40px]">
                {colTasks.map((task) => (
                  <div key={task.id} className="bg-card border rounded-lg p-3">
                    <p className="text-sm leading-snug">{task.title}</p>
                    {NEXT_STATUS[task.status] && (
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => onAdvance(task)}
                          title={`Move to ${STATUS_LABEL[NEXT_STATUS[task.status]!]}`}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── List — every task regardless of status, backlog included, nested under
// its parent task to any depth (top-level task -> subtask -> sub-subtask ->
// ...). Two independent ways to manage depth: a global "Level 1 only /
// Levels 1–2 / All levels" cutoff for hiding whole tiers at once, and a
// per-task collapse arrow for folding just one subtree. ────────────────────

interface TaskNode extends Task { children: TaskNode[] }

function buildTaskTree(tasks: Task[]): TaskNode[] {
  const byId = new Map<number, TaskNode>(tasks.map((t) => [ t.id, { ...t, children: [] } ]))
  const roots: TaskNode[] = []
  byId.forEach((node) => {
    const parent = node.parent_id != null ? byId.get(node.parent_id) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  })
  return roots
}

const DEPTH_OPTIONS: { label: string; maxDepth: number | null }[] = [
  { label: 'Level 1 only', maxDepth: 0 },
  { label: 'Levels 1–2', maxDepth: 1 },
  { label: 'All levels', maxDepth: null },
]

function TaskListView({ tasks }: { tasks: Task[] }) {
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())
  const [maxDepth, setMaxDepth] = useState<number | null>(null)
  const tree = useMemo(() => buildTaskTree(tasks), [tasks])

  function toggleCollapse(id: number) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function renderNode(node: TaskNode, depth: number): React.ReactNode {
    if (maxDepth !== null && depth > maxDepth) return null
    const hasChildren = node.children.length > 0
    const isCollapsed = collapsed.has(node.id)
    return (
      <div key={node.id}>
        <div className="flex items-center gap-2 py-2" style={{ paddingLeft: `${depth * 20}px` }}>
          {hasChildren ? (
            <button onClick={() => toggleCollapse(node.id)} className="text-muted-foreground shrink-0" title={isCollapsed ? 'Expand' : 'Collapse'}>
              <ChevronRight className={`w-3 h-3 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
            </button>
          ) : (
            <span className="w-3 shrink-0" />
          )}
          <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[node.status]}`} />
          <p className="text-sm flex-1 truncate">{node.title}</p>
          <span className="text-xs text-muted-foreground shrink-0">{STATUS_LABEL[node.status]}</span>
          {node.due_date && <span className="text-xs text-muted-foreground shrink-0">{node.due_date}</span>}
        </div>
        {hasChildren && !isCollapsed && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto py-6 px-6">
        <div className="flex items-center justify-end gap-1 mb-2">
          {DEPTH_OPTIONS.map(({ label, maxDepth: value }) => (
            <button
              key={label}
              onClick={() => setMaxDepth(value)}
              className={`px-2 py-0.5 rounded text-xs ${maxDepth === value ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-col divide-y">
          {tree.map((node) => renderNode(node, 0))}
          {tasks.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No tasks</p>}
        </div>
      </div>
    </div>
  )
}

// ── Calendar — a plain month grid, read-only (no day-click-to-create like
// EventsPage's own calendar — this is a scoped-down view of one folder). ──

function CalendarView({ events }: { events: WorkspaceEvent[] }) {
  const [month, setMonth] = useState(new Date())
  const start = startOfWeek(startOfMonth(month))
  const end = endOfWeek(endOfMonth(month))
  const days = eachDayOfInterval({ start, end })

  const eventsByDate = new Map<string, WorkspaceEvent[]>()
  events.forEach((e) => {
    const list = eventsByDate.get(e.date) ?? []
    list.push(e)
    eventsByDate.set(e.date, list)
  })

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="flex items-center justify-center gap-4 mb-3">
        <button onClick={() => setMonth((m) => subMonths(m, 1))} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold w-32 text-center">{format(month, 'MMMM yyyy')}</span>
        <button onClick={() => setMonth((m) => addMonths(m, 1))} className="text-muted-foreground hover:text-foreground">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {/* Phone-width agenda — the 7-column grid below gets unusably tiny
          under ~430px (each cell shrinks to ~50px), so below md this
          renders a plain date-grouped list of the same eventsByDate data
          instead of forcing a scaled-down grid. */}
      <div className="md:hidden max-w-3xl mx-auto flex flex-col">
        {days.filter((d) => isSameMonth(d, month) && (eventsByDate.get(format(d, 'yyyy-MM-dd')) ?? []).length > 0).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No events this month</p>
        )}
        {days.filter((d) => isSameMonth(d, month)).map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDate.get(key) ?? []
          if (dayEvents.length === 0) return null
          return (
            <div key={key} className="flex gap-3 py-2 border-b last:border-0">
              <div className={`w-16 shrink-0 text-sm ${isToday(day) ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                {format(day, 'EEE d')}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                {dayEvents.map((e) => (
                  <div key={e.id} className="text-sm bg-accent rounded px-2 py-1 truncate">{e.title}</div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="hidden md:grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden max-w-3xl mx-auto">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="bg-muted text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDate.get(key) ?? []
          return (
            <div key={key} className={`bg-card min-h-[80px] p-1 ${!isSameMonth(day, month) ? 'opacity-40' : ''}`}>
              <div className={`text-xs mb-1 ${isToday(day) ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                {format(day, 'd')}
              </div>
              {dayEvents.map((e) => (
                <div key={e.id} className="text-xs truncate bg-accent rounded px-1 mb-0.5">{e.title}</div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Gantt — epics as bars across a computed date range, positioned with
// plain CSS percentages (no charting library). Only epics with both dates
// set can be placed on a timeline; others are listed below instead of
// being silently dropped. ───────────────────────────────────────────────

function GanttView({ epics }: { epics: Epic[] }) {
  const dated = epics.filter((e): e is Epic & { start_date: string; target_date: string } =>
    !!e.start_date && !!e.target_date)
  const undated = epics.filter((e) => !e.start_date || !e.target_date)

  if (dated.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <GanttChart className="w-8 h-8 opacity-30" />
        <p className="text-sm">No epics with both a start and target date yet</p>
      </div>
    )
  }

  const rangeStart = startOfMonth(new Date(Math.min(...dated.map((e) => parseISO(e.start_date).getTime()))))
  const rangeEnd = endOfMonth(new Date(Math.max(...dated.map((e) => parseISO(e.target_date).getTime()))))
  const totalDays = differenceInCalendarDays(rangeEnd, rangeStart) + 1
  const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd })

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="min-w-[700px] max-w-4xl">
        <div className="flex border-b mb-3">
          {months.map((m) => {
            const daysInMonth = differenceInCalendarDays(endOfMonth(m), startOfMonth(m)) + 1
            return (
              <div
                key={m.toISOString()}
                style={{ width: `${(daysInMonth / totalDays) * 100}%` }}
                className="text-xs text-muted-foreground font-medium pb-1 shrink-0 truncate"
              >
                {format(m, 'MMM yyyy')}
              </div>
            )
          })}
        </div>
        <div className="flex flex-col gap-3">
          {dated.map((epic) => {
            const s = parseISO(epic.start_date)
            const e = parseISO(epic.target_date)
            const offsetPct = (differenceInCalendarDays(s, rangeStart) / totalDays) * 100
            const widthPct = Math.max(((differenceInCalendarDays(e, s) + 1) / totalDays) * 100, 1.5)
            const percent = epic.tasks_count > 0 ? Math.round((epic.done_tasks_count / epic.tasks_count) * 100) : 0
            return (
              <div key={epic.id} className="flex items-center gap-3">
                <span className="w-36 text-sm truncate shrink-0" title={epic.title}>{epic.title}</span>
                <div className="flex-1 relative h-6">
                  <div
                    className="absolute h-6 rounded-md bg-primary/20 border border-primary overflow-hidden"
                    style={{ left: `${offsetPct}%`, width: `${widthPct}%` }}
                    title={`${epic.start_date} → ${epic.target_date}`}
                  >
                    <div className="h-full bg-primary/50" style={{ width: `${percent}%` }} />
                  </div>
                </div>
                <span className="w-14 text-xs text-muted-foreground text-right shrink-0">
                  {epic.done_tasks_count}/{epic.tasks_count}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {undated.length > 0 && (
        <p className="text-xs text-muted-foreground mt-6">
          Not shown (missing a start or target date): {undated.map((e) => e.title).join(', ')}
        </p>
      )}
    </div>
  )
}

// ── Overview — the landing view when you click into a folder: a dashboard
// (a few high-level epics, upcoming events) plus the folder's documents
// shown as a proper primary section rather than the thin chip row the other
// four views get. ────────────────────────────────────────────────────────

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${percent}%` }} />
    </div>
  )
}

// A small header-row link to a sibling view — always shown regardless of
// whether this section has any data, since Overview doubles as the
// navigation hub for "every other way to look at this folder."
function ViewLink({ folderId, view, label, navigate }: { folderId: number; view: string; label: string; navigate: (path: string) => void }) {
  return (
    <button
      onClick={() => navigate(`/folders/${folderId}?view=${view}`)}
      className="text-xs text-muted-foreground hover:text-foreground"
    >
      {label} →
    </button>
  )
}

function OverviewView({
  folderId, documents, tasks, epics, events, navigate,
}: {
  folderId: number
  documents: { id: number; title: string; doc_type: 'document' | 'spreadsheet' | 'table' }[]
  tasks: Task[]
  epics: Epic[]
  events: WorkspaceEvent[]
  navigate: (path: string) => void
}) {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const upcomingEvents = events.filter((e) => e.date >= todayStr).slice(0, 5)
  const openTasks = tasks.filter((t) => t.status !== 'done')

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Documents, Sheets & Tables</h2>
          <div className="mb-3"><CreateItem folderId={folderId} /></div>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {documents.map((doc) => (
                <Link
                  key={doc.id}
                  to={`/documents/${doc.id}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-accent text-sm min-w-0"
                >
                  {doc.doc_type === 'table'
                    ? <Database className="w-4 h-4 text-muted-foreground shrink-0" />
                    : doc.doc_type === 'spreadsheet'
                    ? <TableIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  }
                  <span className="truncate">{doc.title}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Tasks — links to both task views (Board/List) regardless of
            whether there's anything open right now. */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tasks</h2>
            <div className="flex items-center gap-3">
              <ViewLink folderId={folderId} view="board" label="Board" navigate={navigate} />
              <ViewLink folderId={folderId} view="list" label="List" navigate={navigate} />
            </div>
          </div>
          {openTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing open.</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {openTasks.length} open task{openTasks.length === 1 ? '' : 's'}
            </p>
          )}
        </section>

        {/* High-level tasks — this app's Epics already are that: a handful
            of top-level items each rolling up several Tasks' completion
            into one progress bar. Body only shows when there are any; the
            link to Gantt stays regardless, same as Tasks/Events above. */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Epics</h2>
            <ViewLink folderId={folderId} view="gantt" label="Gantt" navigate={navigate} />
          </div>
          {epics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No epics yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {epics.slice(0, 5).map((epic) => {
                const percent = epic.tasks_count > 0 ? Math.round((epic.done_tasks_count / epic.tasks_count) * 100) : 0
                return (
                  <div key={epic.id} className="flex items-center gap-3">
                    <span className="flex-1 text-sm truncate" title={epic.title}>{epic.title}</span>
                    <div className="w-32 shrink-0"><ProgressBar percent={percent} /></div>
                    <span className="w-14 text-xs text-muted-foreground text-right shrink-0">
                      {epic.done_tasks_count}/{epic.tasks_count}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upcoming Events</h2>
            <ViewLink folderId={folderId} view="calendar" label="Calendar" navigate={navigate} />
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming events.</p>
          ) : (
            <div className="flex flex-col divide-y">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3 py-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${event.event_type === 'milestone' ? 'bg-purple-500' : 'bg-orange-500'}`} />
                  <span className="flex-1 text-sm truncate">{event.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{format(parseISO(event.date), 'MMM d')}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FolderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const folderId = Number(id)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const view = VIEWS.find((v) => v.key === searchParams.get('view'))?.key ?? 'overview'

  const { data, isLoading } = useFolderContents(folderId)
  const updateFolder = useUpdateFolder()
  const updateTask = useUpdateTask()

  if (isLoading || !data) {
    return (
      <WorkspaceLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </WorkspaceLayout>
    )
  }

  const { folder, documents, tasks, events, epics } = data

  return (
    <WorkspaceLayout>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-6 py-3 shrink-0 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-semibold truncate">{folder.name}</h1>
          <div className="flex gap-1 ml-2 shrink-0">
            {VIEWS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => navigate(`/folders/${folderId}?view=${key}`)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm ${view === key ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => updateFolder.mutate({ id: folderId, archived: !folder.archived })}
            className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground shrink-0"
          >
            {folder.archived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
            {folder.archived ? 'Unarchive' : 'Archive'}
          </button>
        </div>

        {/* Documents — always visible regardless of which view is active,
            since they're part of "everything in this folder" too. Skipped
            on Overview, which already gives documents their own full
            section instead of this thin chip row. */}
        {view !== 'overview' && documents.length > 0 && (
          <div className="border-b px-6 py-2 shrink-0 flex items-center gap-2 overflow-x-auto">
            {documents.map((doc) => (
              <Link
                key={doc.id}
                to={`/documents/${doc.id}`}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border hover:bg-accent shrink-0"
              >
                {doc.doc_type === 'table'
                  ? <Database className="w-3 h-3 text-muted-foreground shrink-0" />
                  : doc.doc_type === 'spreadsheet'
                  ? <TableIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                  : <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                }
                <span className="truncate max-w-[160px]">{doc.title}</span>
              </Link>
            ))}
          </div>
        )}

        {view === 'overview' && (
          <OverviewView folderId={folderId} documents={documents} tasks={tasks} epics={epics} events={events} navigate={navigate} />
        )}
        {view === 'board' && (
          <BoardView
            tasks={tasks}
            onAdvance={(task) => updateTask.mutate({ id: task.id, status: NEXT_STATUS[task.status]! })}
          />
        )}
        {view === 'list' && <TaskListView tasks={tasks} />}
        {view === 'calendar' && <CalendarView events={events} />}
        {view === 'gantt' && <GanttView epics={epics} />}
      </div>
    </WorkspaceLayout>
  )
}
