import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Loader2, TriangleAlert, Users } from 'lucide-react'
import { Button } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useResourceAllocations } from '@/api/resourceAllocations'
import { useWorkspace } from '@/api/workspace'
import { canManageWorkspace } from '@/api/workspaces'
import { useWorkspaceMembers } from '@/api/workspaceMembers'
import { flattenFolders, projectsOf } from '@/data/folder'
import { overAllocated, personLoads, projectLoads, weekEnd, weekLabel, weekRange, WEEKS_SHOWN } from '@/data/resource'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useAuthStore } from '@/store/auth'
import { todayISO } from '@/util/date'
import type { ResourceAllocation, WorkspaceMember } from '@/types'
import PersonCard from './PersonCard'
import ProjectCard from './ProjectCard'
import './ResourcesScreen.scss'

type Tab = 'people' | 'projects'

// Stable while a query has no data yet, so the memos below don't rerun.
const NO_MEMBERS: WorkspaceMember[] = []
const NO_ALLOCATIONS: ResourceAllocation[] = []

// Resource management: each person's weekly capacity and how many hours a week
// they are allocated to projects, with a warning for any week over capacity.
// Everyone in the Space can read the plan; admins and owners change it.
export default function ResourcesScreen() {
  usePageTitle('Resources')
  const me = useAuthStore((s) => s.user)
  const { data: workspace, isLoading: loadingWorkspace } = useWorkspace()
  const { data: members = NO_MEMBERS, isLoading: loadingMembers } = useWorkspaceMembers(workspace?.id ?? 0)
  const { data: allocations = NO_ALLOCATIONS, isLoading: loadingAllocations } = useResourceAllocations()
  const [tab, setTab] = useState<Tab>('people')
  // How many weeks the window has been moved from the current week.
  const [offset, setOffset] = useState(0)
  const today = todayISO()

  const weeks = useMemo(() => weekRange(today, WEEKS_SHOWN, offset), [today, offset])
  const people = useMemo(() => personLoads(members, allocations, weeks), [members, allocations, weeks])
  const projects = useMemo(() => projectLoads(allocations, weeks), [allocations, weeks])
  const tree = workspace?.folders
  const names = useMemo(() => new Map(flattenFolders(tree ?? []).map((f): [number, string] => [f.id, f.name])), [tree])
  const projectChoices = useMemo(() => projectsOf(tree ?? []), [tree])
  const canManage = canManageWorkspace(workspace?.role)
  const over = overAllocated(people)
  const isLoading = loadingWorkspace || loadingMembers || loadingAllocations
  const projectName = (folderId: number) => names.get(folderId) ?? 'Archived project'
  const byName = [...projects].sort((a, b) => projectName(a.folderId).localeCompare(projectName(b.folderId)))

  return (
    <WorkspaceLayout>
      <div className="view-resources">
        <div className="resources-header">
          <h1 className="resources-title">Resources</h1>
          <div className="resources-tabs" role="group" aria-label="Group by">
            {([['people', 'People'], ['projects', 'Projects']] as const).map(([value, label]) => (
              <Button
                key={value}
                aria-pressed={tab === value}
                onClick={() => setTab(value)}
                className={`resources-tab${tab === value ? ' resources-tab--active' : ''}`}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="resources-nav" role="group" aria-label="Weeks shown">
            <Button variant="secondary" aria-label="Earlier weeks" onClick={() => setOffset(offset - 4)}>
              <ChevronLeft className="resources-icon" aria-hidden="true" />
            </Button>
            <span className="resources-window">{weekLabel(weeks[0])} to {weekLabel(weekEnd(weeks[weeks.length - 1]))}</span>
            <Button variant="secondary" aria-label="Later weeks" onClick={() => setOffset(offset + 4)}>
              <ChevronRight className="resources-icon" aria-hidden="true" />
            </Button>
            {offset !== 0 && <Button variant="secondary" onClick={() => setOffset(0)}>This week</Button>}
          </div>
        </div>

        <div className="resources-body">
          <div className="resources-content">
            {over.length > 0 && (
              <p role="status" className="resources-notice">
                <TriangleAlert className="resources-icon" aria-hidden="true" />
                <span>
                  Over capacity: {over.map((p) => `${p.name} (${p.overWeeks} ${p.overWeeks === 1 ? 'week' : 'weeks'})`).join(', ')}
                </span>
              </p>
            )}

            {canManage && !isLoading && projectChoices.length === 0 && (
              <p className="resources-hint">
                Allocating people needs a project. Create one on the <Link to="/projects" className="resources-link">Projects page</Link> or make a folder a project from the sidebar.
              </p>
            )}

            {isLoading && <Loader2 className="resources-icon resources-icon--spin" aria-label="Loading" />}

            {!isLoading && tab === 'people' && people.map((load) => (
              <PersonCard
                key={load.userId}
                load={load}
                workspaceId={workspace?.id ?? 0}
                projects={projectChoices}
                projectName={projectName}
                canManage={canManage}
                isMe={load.userId === me?.id}
                today={today}
              />
            ))}

            {!isLoading && tab === 'projects' && byName.map((project) => (
              <ProjectCard key={project.folderId} project={project} name={projectName(project.folderId)} people={people} />
            ))}

            {!isLoading && tab === 'projects' && byName.length === 0 && (
              <div className="resources-empty">
                <Users className="resources-empty_icon" aria-hidden="true" />
                <p>No one is allocated to a project in these weeks.{canManage ? ' Allocate people from the People tab.' : ''}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
