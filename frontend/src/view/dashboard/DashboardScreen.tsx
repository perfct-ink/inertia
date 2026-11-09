import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Folder as FolderIcon, LayoutDashboard, Loader2 } from 'lucide-react'
import { FormError, HealthBadge, Select, StatusDot, classNames } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { ProgressBar } from '@/components/Timeline'
import ProjectIcon from '@/components/project/ProjectIcon'
import { useWorkspace } from '@/api/workspace'
import { useTasks } from '@/api/tasks'
import { useMilestones } from '@/api/milestones'
import { useInitiatives } from '@/api/initiatives'
import { useEpics } from '@/api/epics'
import { useSprints } from '@/api/sprints'
import { useProjectStore } from '@/store/projects'
import { useBoardStatuses } from '@/hooks/useBoardStatuses'
import { usePageTitle } from '@/hooks/usePageTitle'
import { buildDashboard, dashboardPath, findFolder, scopeChoices, taskBoardPath } from '@/data/dashboard'
import { HEALTH_LABEL } from '@/data/milestone'
import { projectStatusLabel } from '@/data/project'
import { HORIZONS, HORIZON_LABEL } from '@/data/roadmap'
import { sprintBoardPath } from '@/data/sprint'
import { BOARD_STATUSES } from '@/data/task_status'
import { errorMessage } from '@/util/errorMessage'
import { todayISO } from '@/util/date'
import type { Epic, Folder, Initiative, MilestoneHealth, Milestone, PlanningStatus, Sprint, Task } from '@/types'
import './DashboardScreen.scss'

const NO_FOLDERS: Folder[] = []
const NO_TASKS: Task[] = []
const NO_MILESTONES: Milestone[] = []
const NO_INITIATIVES: Initiative[] = []
const NO_EPICS: Epic[] = []
const NO_SPRINTS: Sprint[] = []

const HEALTHS: MilestoneHealth[] = ['on_track', 'at_risk', 'off_track']

const SPRINT_STATUSES: { status: PlanningStatus; label: string }[] = [
  { status: 'planned', label: 'Planned' },
  { status: 'active', label: 'Active' },
  { status: 'done', label: 'Done' },
]

function Tile({ label, value, detail, alert }: { label: string; value: string | number; detail?: string; alert?: boolean }) {
  return (
    <div className={classNames('dashboard-tile', alert && 'dashboard-tile--alert')}>
      <dt className="dashboard-tile-label">{label}</dt>
      <dd className="dashboard-tile-value">{value}</dd>
      {detail && <dd className="dashboard-tile-detail">{detail}</dd>}
    </div>
  )
}

// One board on the dashboard: a title, its numbers and a link to the real thing.
function BoardCard({ title, to, linkLabel, children }: { title: string; to: string; linkLabel: string; children: React.ReactNode }) {
  return (
    <section className="dashboard-card" aria-label={title}>
      <div className="dashboard-card-top">
        <h3 className="dashboard-card-title">{title}</h3>
        <Link to={to} className="dashboard-link">{linkLabel}</Link>
      </div>
      <ul className="dashboard-counts">{children}</ul>
    </section>
  )
}

// A summary of the Space (or the project open in it), or of one folder and
// everything under it: totals, the folders inside, and the task board, roadmap
// board, sprints and milestones. Like every page it shows what the API returns
// for the signed-in person, so it never reveals anything they could not open.
export default function DashboardScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const scopeId = Number(searchParams.get('folder')) || null
  const projectId = useProjectStore((s) => s.activeProjectId)

  const workspace = useWorkspace()
  const tasks = useTasks()
  const milestones = useMilestones()
  const initiatives = useInitiatives()
  const epics = useEpics()
  const sprints = useSprints()
  const queries = [workspace, tasks, milestones, initiatives, epics, sprints]
  const isLoading = queries.some((q) => q.isLoading)
  const failure = queries.find((q) => q.isError)?.error

  const folders = workspace.data?.folders ?? NO_FOLDERS
  const dashboard = useMemo(
    () => buildDashboard(
      {
        folders,
        tasks: tasks.data ?? NO_TASKS,
        milestones: milestones.data ?? NO_MILESTONES,
        initiatives: initiatives.data ?? NO_INITIATIVES,
        epics: epics.data ?? NO_EPICS,
        sprints: sprints.data ?? NO_SPRINTS,
      },
      scopeId,
      todayISO(),
      projectId,
    ),
    [folders, tasks.data, milestones.data, initiatives.data, epics.data, sprints.data, scopeId, projectId],
  )
  const project = findFolder(folders, projectId)
  const choices = useMemo(() => scopeChoices(folders, projectId), [folders, projectId])
  const { statuses } = useBoardStatuses(dashboard.scope?.id)
  usePageTitle(dashboard.scope ? `Dashboard: ${dashboard.scope.name}` : 'Dashboard')

  const { tasks: summary, milestones: milestoneRollup, roadmap, sprints: sprintRollup } = dashboard
  const today = todayISO()
  const showRoadmap = HORIZONS.some((h) => roadmap[h] > 0)
  const showBoards = summary.total > 0 || showRoadmap || milestoneRollup.total > 0 || sprintRollup.total > 0
  const isEmpty = dashboard.files === 0 && !showBoards && dashboard.folders.length === 0

  return (
    <WorkspaceLayout>
      <div className="view-dashboard">
        <div className="dashboard-header">
          <h1 className="dashboard-title">
            Dashboard
            {dashboard.scope && <>{' '}<span className="dashboard-title_scope">{dashboard.scope.name}</span></>}
          </h1>
          {choices.length > 0 && (
            <Select
              aria-label="Folder"
              value={dashboard.scope && dashboard.scope.id !== project?.id ? dashboard.scope.id : ''}
              onChange={(e) => navigate(dashboardPath(Number(e.target.value) || null))}
              className="dashboard-scope"
            >
              <option value="">{project ? `All of ${project.name}` : 'All folders'}</option>
              {choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
            </Select>
          )}
        </div>

        <div className="dashboard-body">
          <div className="dashboard-content">
            <FormError message={failure ? errorMessage(failure) : null} />

            {isLoading && <Loader2 className="dashboard-spinner" aria-label="Loading" />}

            {!isLoading && !failure && isEmpty && (
              <div className="dashboard-empty">
                <LayoutDashboard className="dashboard-empty_icon" aria-hidden="true" />
                <p>Nothing to summarize yet. Add documents, tasks or milestones and they show up here.</p>
              </div>
            )}

            {!isLoading && !failure && !isEmpty && (
              <>
                <dl className="dashboard-tiles" aria-label="Summary">
                  <Tile label="Files" value={dashboard.files} />
                  <Tile label="Open tasks" value={summary.open} detail={summary.due_soon > 0 ? `${summary.due_soon} due this week` : undefined} />
                  <Tile label="Overdue" value={summary.overdue} alert={summary.overdue > 0} />
                  <Tile label="Done" value={`${summary.percent}%`} detail={summary.total > 0 ? `${summary.done} of ${summary.total} tasks` : undefined} />
                </dl>

                {dashboard.folders.length > 0 && (
                  <section aria-labelledby="dashboard-folders">
                    <h2 id="dashboard-folders" className="dashboard-heading">Folders</h2>
                    <ul className="dashboard-folders">
                      {dashboard.folders.map(({ folder, files, tasks: folderTasks }) => {
                        const isProject = folder.kind === 'project'
                        return (
                          <li key={folder.id} className="dashboard-folder">
                            <div className="dashboard-folder-top">
                              {isProject ? <ProjectIcon project={folder} /> : <FolderIcon className="dashboard-icon" aria-hidden="true" />}
                              <Link to={dashboardPath(folder.id)} className="dashboard-link dashboard-folder-name">{folder.name}</Link>
                              {isProject && <span className="dashboard-muted">{projectStatusLabel(folder.project_status)}</span>}
                              <span className="dashboard-muted">{files} {files === 1 ? 'file' : 'files'}</span>
                              {folderTasks.overdue > 0 && <span className="dashboard-overdue">{folderTasks.overdue} overdue</span>}
                              <Link to={`/folders/${folder.id}`} className="dashboard-link dashboard-folder-open" aria-label={`Open ${folder.name}`}>Open</Link>
                            </div>
                            {folderTasks.total > 0 && (
                              <div className="dashboard-folder-progress">
                                <ProgressBar percent={folderTasks.percent} />
                                <span className="dashboard-muted">{folderTasks.done}/{folderTasks.total}</span>
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                )}

                {showBoards && (
                  <section aria-labelledby="dashboard-boards">
                    <h2 id="dashboard-boards" className="dashboard-heading">Boards</h2>
                    <div className="dashboard-cards">
                      {summary.total > 0 && (
                        <BoardCard title="Task board" to={taskBoardPath(dashboard.scope?.id ?? null)} linkLabel="Open board">
                          {BOARD_STATUSES.map((status) => (
                            <li key={status} className="dashboard-count">
                              <StatusDot color={statuses[status].color} />
                              <span className="dashboard-count-label">{statuses[status].label}</span>
                              <span className="dashboard-count-value">{summary.by_status[status]}</span>
                            </li>
                          ))}
                          {summary.by_status.backlog > 0 && (
                            <li className="dashboard-count">
                              <StatusDot color={statuses.backlog.color} />
                              <span className="dashboard-count-label">{statuses.backlog.label}</span>
                              <span className="dashboard-count-value">{summary.by_status.backlog}</span>
                            </li>
                          )}
                        </BoardCard>
                      )}

                      {showRoadmap && (
                        <BoardCard title="Roadmap board" to="/roadmap?view=board" linkLabel="Open roadmap">
                          {HORIZONS.map((horizon) => (
                            <li key={horizon} className="dashboard-count">
                              <span className="dashboard-count-label">{HORIZON_LABEL[horizon]}</span>
                              <span className="dashboard-count-value">{roadmap[horizon]}</span>
                            </li>
                          ))}
                        </BoardCard>
                      )}

                      {sprintRollup.total > 0 && (
                        <BoardCard
                          title="Sprint board"
                          to={sprintRollup.active ? sprintBoardPath(sprintRollup.active.sprint.id) : '/sprints'}
                          linkLabel={sprintRollup.active ? 'Open sprint' : 'Open sprints'}
                        >
                          {SPRINT_STATUSES.map(({ status, label }) => (
                            <li key={status} className="dashboard-count">
                              <span className="dashboard-count-label">{label}</span>
                              <span className="dashboard-count-value">{sprintRollup.counts[status]}</span>
                            </li>
                          ))}
                          {sprintRollup.active && (
                            <li className="dashboard-count dashboard-count--note">
                              <span className="dashboard-count-label">
                                {sprintRollup.active.sprint.title}: {sprintRollup.active.sprint.done_tasks_count} of {sprintRollup.active.sprint.tasks_count} tasks done
                              </span>
                              <span className="dashboard-count-value">{sprintRollup.active.percent}%</span>
                            </li>
                          )}
                        </BoardCard>
                      )}

                      {milestoneRollup.total > 0 && (
                        <BoardCard title="Milestones" to="/milestones" linkLabel="Open milestones">
                          {HEALTHS.map((health) => (
                            <li key={health} className="dashboard-count">
                              <span className="dashboard-count-label">{HEALTH_LABEL[health]}</span>
                              <span className="dashboard-count-value">{milestoneRollup.health[health]}</span>
                            </li>
                          ))}
                          {milestoneRollup.next && (
                            <li className="dashboard-count dashboard-count--note">
                              <span className="dashboard-count-label">
                                Next: {milestoneRollup.next.title}
                                {milestoneRollup.next.target_date && `, ${format(parseISO(milestoneRollup.next.target_date), 'MMM d, yyyy')}`}
                              </span>
                              <HealthBadge health={milestoneRollup.next.health} />
                            </li>
                          )}
                        </BoardCard>
                      )}
                    </div>
                  </section>
                )}

                {dashboard.upcoming.length > 0 && (
                  <section aria-labelledby="dashboard-upcoming">
                    <h2 id="dashboard-upcoming" className="dashboard-heading">Coming up</h2>
                    <ul className="dashboard-upcoming">
                      {dashboard.upcoming.map((task) => (
                        <li key={task.id} className="dashboard-task">
                          <span className="dashboard-task-title">{task.title}</span>
                          {task.document && <Link to={`/documents/${task.document.id}`} className="dashboard-link dashboard-task-doc">{task.document.title}</Link>}
                          <span className={classNames('dashboard-task-due', task.due_date! < today && 'dashboard-task-due--overdue')}>
                            {format(parseISO(task.due_date!), 'MMM d')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
