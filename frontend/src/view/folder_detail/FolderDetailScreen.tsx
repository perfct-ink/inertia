import { Button, StatusDot, classNames, Select } from '@/components/ui'
import { Database } from 'lucide-react'
import { useState, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, useLocation, Link, Navigate } from 'react-router-dom'
import {
  Loader2, ArrowLeft, ArrowRight, Archive, ArchiveRestore,
  LayoutList, Kanban as KanbanIcon, Calendar as CalendarIcon, GanttChart,
  ChevronLeft, ChevronRight, FileText, Table as TableIcon, LayoutDashboard, Palette, LayoutGrid,
} from 'lucide-react'
import {
  format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isToday,
  addMonths, subMonths,
} from 'date-fns'
import CreateItem from '@/components/CreateItem'
import FeatureRollup from '@/components/FeatureRollup'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { ProgressBar } from '@/components/Timeline'
import { useFolderContents, useUpdateFolder } from '@/api/folders'
import { useWorkspace } from '@/api/workspace'
import { canWriteWorkspace } from '@/api/workspaces'
import { useUpdateTask } from '@/api/tasks'
import { useMilestones } from '@/api/milestones'
import { useInitiatives } from '@/api/initiatives'
import type { Document, Task, WorkspaceEvent, Epic } from '@/types'
import './FolderDetailScreen.scss'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useBoardStatuses } from '@/hooks/useBoardStatuses'
import { StatusSettings } from '@/components/workspace/StatusSettings'
import { donePercent, milestoneMarkers } from '@/data/schedule'
import { BOARD_STATUSES, NEXT_STATUS, nextStatusLabel, type BoardStatuses } from '@/data/task_status'
import GanttPane from './GanttPane'
import CardsView from './CardsView'
import { buildTaskTree, type TaskNode } from '@/data/task'
import { homeDocumentToOpen } from '@/data/folder'
import { folderPermissions } from '@/data/folderRole'
import { FolderPresence } from '@/components/file-manager/FolderPresence'
import { SharedFolderBanner, ShareFolderButton } from '@/components/file-manager/FolderSharing'

const dotClass = (name: string) => `folder_detail-dot folder_detail-dot--${name}`

const VIEWS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'board', label: 'Board', icon: KanbanIcon },
  { key: 'list', label: 'List', icon: LayoutList },
  { key: 'cards', label: 'Cards', icon: LayoutGrid },
  { key: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { key: 'gantt', label: 'Gantt', icon: GanttChart },
] as const

// ── Board — no drag, just a "move to next status" arrow. The full
// drag-and-drop board lives on TasksPage; this is deliberately simpler
// since it's one of four views sharing this page. ──────────────────────────

function BoardView({ tasks, statuses, onAdvance }: { tasks: Task[]; statuses: BoardStatuses; onAdvance?: (task: Task) => void }) {
  return (
    <div className="folder_detail-pane">
      <div className="folder_detail-board">
        {BOARD_STATUSES.map((key) => {
          const colTasks = tasks.filter((t) => t.status === key)
          return (
            <div key={key} className="folder_detail-column">
              <div className="folder_detail-column-header">
                <StatusDot color={statuses[key].color} />
                <span className="folder_detail-column-label">{statuses[key].label}</span>
                <span className="folder_detail-count">{colTasks.length}</span>
              </div>
              <div className="folder_detail-column-body">
                {colTasks.map((task) => (
                  <div key={task.id} className="folder_detail-card">
                    <p className="folder_detail-card-title">{task.title}</p>
                    {onAdvance && NEXT_STATUS[task.status] && (
                      <div className="folder_detail-card-actions">
                        <Button
                          onClick={() => onAdvance(task)}
                          title={`Move to ${nextStatusLabel(statuses, task.status)}`}
                          aria-label={`Move to ${nextStatusLabel(statuses, task.status)}`}
                          className="folder_detail-subtle"
                        >
                          <ArrowRight className="folder_detail-icon--sm" />
                        </Button>
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

const DEPTH_OPTIONS: { label: string; maxDepth: number | null }[] = [
  { label: 'Level 1 only', maxDepth: 0 },
  { label: 'Levels 1–2', maxDepth: 1 },
  { label: 'All levels', maxDepth: null },
]

function TaskListView({ tasks, statuses }: { tasks: Task[]; statuses: BoardStatuses }) {
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
        <div className="folder_detail-row" style={{ paddingLeft: `${depth * 20}px` }}>
          {hasChildren ? (
            <Button onClick={() => toggleCollapse(node.id)} className="folder_detail-subtle folder_detail-shrink" title={isCollapsed ? 'Expand' : 'Collapse'}>
              <ChevronRight className={classNames('folder_detail-icon--xs folder_detail-icon--chevron', !isCollapsed && 'folder_detail-icon--open')} />
            </Button>
          ) : (
            <span className="folder_detail-row-spacer" />
          )}
          <StatusDot color={statuses[node.status].color} />
          <p className="folder_detail-row-title">{node.title}</p>
          <span className="folder_detail-count">{statuses[node.status].label}</span>
          {node.due_date && <span className="folder_detail-count">{node.due_date}</span>}
        </div>
        {hasChildren && !isCollapsed && node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="folder_detail-pane folder_detail-pane--list">
      <div className="folder_detail-list">
        <div className="folder_detail-list-toolbar">
          {DEPTH_OPTIONS.map(({ label, maxDepth: value }) => (
            <Button
              key={label}
              onClick={() => setMaxDepth(value)}
              className={classNames('folder_detail-subtle folder_detail-tab folder_detail-tab--compact', maxDepth === value && 'folder_detail-tab--active')}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="folder_detail-list-rows">
          {tree.map((node) => renderNode(node, 0))}
          {tasks.length === 0 && <p className="folder_detail-note folder_detail-note--empty">No tasks</p>}
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
    <div className="folder_detail-pane">
      <div className="folder_detail-month_nav">
        <Button onClick={() => setMonth((m) => subMonths(m, 1))} aria-label="Previous month" className="folder_detail-subtle">
          <ChevronLeft className="folder_detail-icon--md" />
        </Button>
        <span className="folder_detail-month">{format(month, 'MMMM yyyy')}</span>
        <Button onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month" className="folder_detail-subtle">
          <ChevronRight className="folder_detail-icon--md" />
        </Button>
      </div>
      {/* Phone-width agenda — the 7-column grid below gets unusably tiny
          under ~430px (each cell shrinks to ~50px), so below md this
          renders a plain date-grouped list of the same eventsByDate data
          instead of forcing a scaled-down grid. */}
      <div className="folder_detail-agenda">
        {days.filter((d) => isSameMonth(d, month) && (eventsByDate.get(format(d, 'yyyy-MM-dd')) ?? []).length > 0).length === 0 && (
          <p className="folder_detail-note folder_detail-note--empty">No events this month</p>
        )}
        {days.filter((d) => isSameMonth(d, month)).map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDate.get(key) ?? []
          if (dayEvents.length === 0) return null
          return (
            <div key={key} className="folder_detail-agenda-day">
              <div className={classNames('folder_detail-day_label', isToday(day) && 'folder_detail-day_label--today')}>
                {format(day, 'EEE d')}
              </div>
              <div className="folder_detail-agenda-events">
                {dayEvents.map((e) => (
                  <div key={e.id} className="folder_detail-chip">{e.title}</div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="folder_detail-month_grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="folder_detail-month_grid-weekday">{d}</div>
        ))}
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDate.get(key) ?? []
          return (
            <div key={key} className={classNames('folder_detail-cell', !isSameMonth(day, month) && 'folder_detail-cell--outside')}>
              <div className={classNames('folder_detail-cell-day', isToday(day) && 'folder_detail-cell-day--today')}>
                {format(day, 'd')}
              </div>
              {dayEvents.map((e) => (
                <div key={e.id} className="folder_detail-chip folder_detail-chip--cell">{e.title}</div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Overview — the landing view when you click into a folder: a dashboard
// (a few high-level epics, upcoming events) plus the folder's documents
// shown as a proper primary section rather than the thin chip row the other
// four views get. The Gantt tab renders through GanttPane.tsx (shared
// Timeline plus dependency links). ─────────────────────────────────────────

// A small header-row link to a sibling view — always shown regardless of
// whether this section has any data, since Overview doubles as the
// navigation hub for "every other way to look at this folder."
function ViewLink({ folderId, view, label, navigate }: { folderId: number; view: string; label: string; navigate: (path: string) => void }) {
  return (
    <Button
      onClick={() => navigate(`/folders/${folderId}?view=${view}`)}
      className="folder_detail-subtle"
    >
      {label} →
    </Button>
  )
}

function OverviewView({
  folderId, documents, tasks, epics, events, navigate, canWrite, planning,
}: {
  folderId: number
  documents: { id: number; title: string; doc_type: Document['doc_type'] }[]
  tasks: Task[]
  epics: Epic[]
  events: WorkspaceEvent[]
  navigate: (path: string) => void
  // Offer creating and uploading (the user may change what is in the folder).
  canWrite: boolean
  // The Space's planning data (feature rollup, Gantt) is out of reach for someone invited to the folder.
  planning: boolean
}) {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const upcomingEvents = events.filter((e) => e.date >= todayStr).slice(0, 5)
  const openTasks = tasks.filter((t) => t.status !== 'done')

  return (
    <div className="folder_detail-pane folder_detail-pane--overview">
      <div className="folder_detail-overview">
        {planning && <FeatureRollup folderId={folderId} />}
        <section>
          <h2 className="folder_detail-heading folder_detail-spaced">Documents, Sheets & Collections</h2>
          {canWrite && <div className="folder_detail-spaced"><CreateItem folderId={folderId} /></div>}
          {documents.length === 0 ? (
            <p className="folder_detail-note">No documents yet.</p>
          ) : (
            <div className="folder_detail-doc_grid">
              {documents.map((doc) => (
                <Link
                  key={doc.id}
                  to={`/documents/${doc.id}`}
                  className="folder_detail-doc"
                >
                  {doc.doc_type === 'table'
                    ? <Database className="folder_detail-icon--md folder_detail-icon--doc" />
                    : doc.doc_type === 'spreadsheet'
                    ? <TableIcon className="folder_detail-icon--md folder_detail-icon--doc" />
                    : <FileText className="folder_detail-icon--md folder_detail-icon--doc" />
                  }
                  <span className="folder_detail-doc-title">{doc.title}</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Tasks — links to both task views (Board/List) regardless of
            whether there's anything open right now. */}
        <section>
          <div className="folder_detail-section_header">
            <h2 className="folder_detail-heading">Tasks</h2>
            <div className="folder_detail-section_links">
              <ViewLink folderId={folderId} view="board" label="Board" navigate={navigate} />
              <ViewLink folderId={folderId} view="list" label="List" navigate={navigate} />
            </div>
          </div>
          {openTasks.length === 0 ? (
            <p className="folder_detail-note">Nothing open.</p>
          ) : (
            <p className="folder_detail-note">
              {openTasks.length} open task{openTasks.length === 1 ? '' : 's'}
            </p>
          )}
        </section>

        {/* High-level tasks — this app's Epics already are that: a handful
            of top-level items each rolling up several Tasks' completion
            into one progress bar. Body only shows when there are any; the
            link to Gantt stays regardless, same as Tasks/Events above. */}
        <section>
          <div className="folder_detail-section_header">
            <h2 className="folder_detail-heading">Epics</h2>
            {planning && <ViewLink folderId={folderId} view="gantt" label="Gantt" navigate={navigate} />}
          </div>
          {epics.length === 0 ? (
            <p className="folder_detail-note">No epics yet.</p>
          ) : (
            <div className="folder_detail-epics">
              {epics.slice(0, 5).map((epic) => {
                const percent = donePercent(epic)
                return (
                  <div key={epic.id} className="folder_detail-epic">
                    <span className="folder_detail-epic-title" title={epic.title}>{epic.title}</span>
                    <div className="folder_detail-epic-bar"><ProgressBar percent={percent} /></div>
                    <span className="folder_detail-count folder_detail-count--fixed">
                      {epic.done_tasks_count}/{epic.tasks_count}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section>
          <div className="folder_detail-section_header">
            <h2 className="folder_detail-heading">Upcoming Events</h2>
            <ViewLink folderId={folderId} view="calendar" label="Calendar" navigate={navigate} />
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="folder_detail-note">No upcoming events.</p>
          ) : (
            <div className="folder_detail-events">
              {upcomingEvents.map((event) => (
                <div key={event.id} className="folder_detail-row folder_detail-row--event">
                  <span className={dotClass(event.event_type === 'milestone' ? 'milestone' : 'event')} />
                  <span className="folder_detail-row-title">{event.title}</span>
                  <span className="folder_detail-count">{format(parseISO(event.date), 'MMM d')}</span>
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

export default function FolderDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const folderId = Number(id)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()

  const { data, isLoading } = useFolderContents(folderId)
  const { data: workspace } = useWorkspace()
  const { statuses } = useBoardStatuses(folderId)
  const [showStatuses, setShowStatuses] = useState(false)
  const updateFolder = useUpdateFolder()
  const updateTask = useUpdateTask()
  const { data: allMilestones = [] } = useMilestones()
  const { data: initiatives = [] } = useInitiatives()
  usePageTitle(data?.folder.name)
  // What the user may do here: a member of the Space follows their Space role;
  // someone invited to the folder (`shared`) follows the invitation.
  const perms = folderPermissions(data?.access)

  if (isLoading || !data) {
    return (
      <WorkspaceLayout>
        <div className="folder_detail-center">
          <Loader2 className="folder_detail-icon--lg folder_detail-icon--spin" />
        </div>
      </WorkspaceLayout>
    )
  }

  const { folder, documents, tasks, events, epics } = data
  // The Gantt reads the Space's planning data (milestones, initiatives), which
  // someone invited to the folder can't reach, so it isn't offered to them.
  const views = perms.shared ? VIEWS.filter((v) => v.key !== 'gantt') : VIEWS
  const view = views.find((v) => v.key === searchParams.get('view'))?.key ?? 'overview'
  const milestones = milestoneMarkers(allMilestones.filter((m) => m.folder_id === folderId))
  // Opening the folder lands on its home document; ?view=overview (or any view) shows the contents.
  const homeId = homeDocumentToOpen(folder, location.search)
  if (homeId) return <Navigate to={`/documents/${homeId}`} replace />

  return (
    <WorkspaceLayout>
      <div className="view-folder_detail">
        <div className="folder_detail-header">
          <Button onClick={() => navigate(-1)} aria-label="Back" className="folder_detail-subtle folder_detail-shrink">
            <ArrowLeft className="folder_detail-icon--md" />
          </Button>
          <h1 className="folder_detail-title">{folder.name}</h1>
          <FolderPresence folderId={folderId} enabled={perms.shared || Boolean(workspace?.shared)} />
          <div className="folder_detail-tabs">
            {views.map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                onClick={() => navigate(`/folders/${folderId}?view=${key}`)}
                className={classNames('folder_detail-subtle folder_detail-tab', view === key && 'folder_detail-tab--active')}
              >
                <Icon className="folder_detail-icon--sm" />
                {label}
              </Button>
            ))}
          </div>
          <div className="folder_detail-actions">
            {perms.canShare && <ShareFolderButton folder={folder} />}
            {(view === 'board' || view === 'list') && canWriteWorkspace(workspace?.role) && !perms.shared && perms.canWrite && (
              <Button
                onClick={() => setShowStatuses(true)}
                className="folder_detail-subtle folder_detail-action"
                title="Rename and recolor the statuses"
              >
                <Palette className="folder_detail-icon--sm" />
                Statuses
              </Button>
            )}
            {perms.canWrite && !perms.shared && (
              <Button
                onClick={() => updateFolder.mutate({ id: folderId, archived: !folder.archived })}
                className="folder_detail-subtle folder_detail-action"
              >
                {folder.archived ? <ArchiveRestore className="folder_detail-icon--sm" /> : <Archive className="folder_detail-icon--sm" />}
                {folder.archived ? 'Unarchive' : 'Archive'}
              </Button>
            )}
          </div>
          {perms.canWrite && !perms.shared && (
            <Select
              aria-label="Home document"
              value={folder.home_document_id ?? ''}
              onChange={(e) => updateFolder.mutate({ id: folderId, home_document_id: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">No home document</option>
              {documents.filter((d) => d.folder_id === folderId).map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </Select>
          )}
        </div>
        {perms.shared && <SharedFolderBanner folderId={folderId} />}

        {/* Documents — always visible regardless of which view is active,
            since they're part of "everything in this folder" too. Skipped
            on Overview, which already gives documents their own full
            section instead of this thin chip row. */}
        {view !== 'overview' && documents.length > 0 && (
          <div className="folder_detail-docs">
            {documents.map((doc) => (
              <Link
                key={doc.id}
                to={`/documents/${doc.id}`}
                className="folder_detail-doc folder_detail-doc--chip"
              >
                {doc.doc_type === 'table'
                  ? <Database className="folder_detail-icon--xs folder_detail-icon--doc" />
                  : doc.doc_type === 'spreadsheet'
                  ? <TableIcon className="folder_detail-icon--xs folder_detail-icon--doc" />
                  : <FileText className="folder_detail-icon--xs folder_detail-icon--doc" />
                }
                <span className="folder_detail-doc-title folder_detail-doc-title--chip">{doc.title}</span>
              </Link>
            ))}
          </div>
        )}

        {view === 'overview' && (
          <OverviewView
            folderId={folderId}
            documents={documents}
            tasks={tasks}
            epics={epics}
            events={events}
            navigate={navigate}
            canWrite={perms.canWrite}
            planning={!perms.shared}
          />
        )}
        {view === 'board' && (
          <BoardView
            tasks={tasks}
            statuses={statuses}
            onAdvance={perms.canWrite ? (task) => updateTask.mutate({ id: task.id, status: NEXT_STATUS[task.status]! }) : undefined}
          />
        )}
        {view === 'list' && <TaskListView tasks={tasks} statuses={statuses} />}
        {view === 'cards' && <CardsView tasks={tasks} epics={epics} />}
        {view === 'calendar' && <CalendarView events={events} />}
        {view === 'gantt' && (
          <div className="folder_detail-pane">
            <GanttPane
              folderName={folder.name}
              folderId={folderId}
              dependencyMode={folder.dependency_mode ?? 'none'}
              milestones={milestones}
              groups={{ initiatives, milestones: allMilestones }}
              epics={epics}
              tasks={tasks}
            />
          </div>
        )}
        <StatusSettings open={showStatuses} folderId={folderId} boardName={folder.name} onClose={() => setShowStatuses(false)} />
      </div>
    </WorkspaceLayout>
  )
}
