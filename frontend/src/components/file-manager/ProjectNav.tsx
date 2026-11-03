import { useEffect, useState, type ComponentType } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CalendarDays, CalendarRange, CheckSquare, ClipboardList, Disc3, FileText, Flag, GanttChart, Goal,
  LayoutDashboard, Lightbulb, ListTree, Map as MapIcon, Milestone, Network, Plus, Rocket, Rows3, Smile,
  Table2, Target, UserCheck, Users,
} from 'lucide-react'
import { Button, FormError, Input, classNames } from '@/components/ui'
import ProjectIcon from '@/components/project/ProjectIcon'
import ProjectIconDialog from '@/components/project/ProjectIconDialog'
import { useWorkspace } from '@/api/workspace'
import { useCreateFolder } from '@/api/folders'
import { errorMessage } from '@/api/tables'
import { folderOfDocument, projectOf, projectsOf } from '@/data/folder'
import { useSelectProject } from '@/hooks/useSelectProject'
import { useOpenProject } from '@/hooks/useOpenProject'
import { useProjectStore } from '@/store/projects'
import type { Folder } from '@/types'
import { FolderItem } from './FolderItem'
import './ProjectNav.scss'

type Section = { label: string; path: string; icon: ComponentType<{ className?: string }> }

// The pages under an open project, grouped by what they're for. Each lists
// only that project's records (the API reads X-Project-Id, see backend
// ProjectScoped). The first group has no heading.
const SECTION_GROUPS: { heading: string | null; sections: Section[] }[] = [
  { heading: null, sections: [
    { label: 'All files', path: '/documents', icon: FileText },
    { label: 'My work', path: '/my-work', icon: UserCheck },
  ] },
  { heading: 'Tasks', sections: [
    { label: 'Tasks', path: '/tasks?view=backlog', icon: CheckSquare },
    { label: 'Task table', path: '/task-table', icon: Rows3 },
    { label: 'Pivot', path: '/pivot', icon: Table2 },
    { label: 'Calendar', path: '/calendar', icon: CalendarRange },
    { label: 'Events', path: '/events?view=list', icon: CalendarDays },
  ] },
  { heading: 'Planning', sections: [
    { label: 'Roadmap', path: '/roadmap', icon: MapIcon },
    { label: 'Timeline', path: '/timeline', icon: GanttChart },
    { label: 'Milestones', path: '/milestones', icon: Milestone },
    { label: 'Initiatives', path: '/initiatives', icon: Flag },
    { label: 'Epics', path: '/epics', icon: Target },
    { label: 'Sprints', path: '/sprints', icon: Rocket },
    { label: 'Hierarchy', path: '/hierarchy', icon: ListTree },
  ] },
  { heading: 'Goals', sections: [
    { label: 'OKRs', path: '/okrs', icon: Goal },
    { label: 'Objectives map', path: '/objectives-map', icon: Network },
    { label: 'Ideas', path: '/ideas', icon: Lightbulb },
  ] },
  { heading: 'Delivery', sections: [
    { label: 'Releases', path: '/releases', icon: Disc3 },
    { label: 'Resources', path: '/resources', icon: Users },
  ] },
]

// The Space's projects as a flat list; selecting one switches the sidebar to
// that project's pages and files, with a way back to the list.
export function ProjectNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: workspace } = useWorkspace()
  const createFolder = useCreateFolder()
  const selectProject = useSelectProject()
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const openProject = useOpenProject()
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [iconFor, setIconFor] = useState<Folder | null>(null)
  const folders = workspace?.folders ?? []
  const projects = projectsOf(folders)

  // Opening a folder or document inside a project opens that project too.
  useEffect(() => {
    const tree = workspace?.folders ?? []
    const folderId = Number(location.pathname.match(/^\/folders\/(\d+)/)?.[1])
      || folderOfDocument(tree, Number(location.pathname.match(/^\/documents\/(\d+)/)?.[1]))?.id
    const project = folderId ? projectOf(tree, folderId) : null
    if (project) selectProject(project.id)
  }, [location.pathname, workspace, selectProject])

  // A project that was archived, deleted or moved away can't stay open.
  useEffect(() => {
    if (workspace && activeProjectId && !projectsOf(workspace.folders).some((p) => p.id === activeProjectId)) selectProject(null)
  }, [workspace, activeProjectId, selectProject])

  function open(project: Folder) {
    selectProject(project.id)
    navigate(`/folders/${project.id}`)
  }

  async function add(name: string) {
    setAdding(false)
    if (!name) return
    setError('')
    try {
      open(await createFolder.mutateAsync({ name, kind: 'project' }))
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const isActive = (path: string) => location.pathname === path.split('?')[0]

  const iconButton = (project: Folder) => (
    <Button title="Change icon" aria-label={`Change icon for ${project.name}`} onClick={() => setIconFor(project)} className="project_nav-action">
      <Smile className="project_nav-icon" />
    </Button>
  )

  return (
    <div className="view-project_nav">
      {openProject ? (
        <>
          <Button onClick={() => navigate('/space')} className="project_nav-back">
            <ArrowLeft className="project_nav-icon" />
            Projects
          </Button>
          <div className="project_nav-row project_nav-row--open">
            <Link to={`/folders/${openProject.id}`} className="project_nav-open">
              <ProjectIcon project={openProject} />
              <span className="project_nav-name">{openProject.name}</span>
            </Link>
            {iconButton(openProject)}
          </div>
          <nav aria-label={`${openProject.name} pages`} className="project_nav-links">
            <Link to={`/folders/${openProject.id}`} className={classNames('project_nav-link', location.pathname === `/folders/${openProject.id}` && 'project_nav-link--active')}>
              <LayoutDashboard className="project_nav-icon" />
              Overview
            </Link>
            {SECTION_GROUPS.map(({ heading, sections }) => (
              <div key={heading ?? 'main'} role="group" aria-label={heading ?? undefined} className="project_nav-group">
                {heading && <p className="project_nav-heading" aria-hidden="true">{heading}</p>}
                {sections.map(({ label, path, icon: Icon }) => (
                  <Link key={label} to={path} className={classNames('project_nav-link', isActive(path) && 'project_nav-link--active')}>
                    <Icon className="project_nav-icon" />
                    {label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
          <div className="project_nav-bar">
            <span className="project_nav-label">Files</span>
          </div>
          <div className="project_nav-files">
            <FolderItem folder={openProject} bare />
          </div>
        </>
      ) : (
        <>
          <div className="project_nav-bar">
            <Button onClick={() => navigate('/space')} className="project_nav-label">Projects</Button>
            <div className="project_nav-tools">
              <Button title="Project requests" aria-label="Project requests" onClick={() => navigate('/project-requests')} className={classNames('project_nav-tool', location.pathname === '/project-requests' && 'project_nav-tool--active')}>
                <ClipboardList className="project_nav-icon" />
              </Button>
              <Button title="New project" aria-label="New project" onClick={() => setAdding(true)} className="project_nav-tool">
                <Plus className="project_nav-icon" />
              </Button>
            </div>
          </div>

          <FormError message={error} />
          {adding && (
            <div className="project_nav-new">
              <Input
                autoFocus
                aria-label="Project name"
                placeholder="Project name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') add(e.currentTarget.value.trim())
                  if (e.key === 'Escape') setAdding(false)
                }}
                onBlur={(e) => add(e.currentTarget.value.trim())}
              />
            </div>
          )}

          {workspace && projects.length === 0 && !adding && (
            <p className="project_nav-note">No projects yet.</p>
          )}

          <ul className="project_nav-list">
            {projects.map((project) => (
              <li key={project.id} className="project_nav-row">
                <Button onClick={() => open(project)} className="project_nav-open">
                  <ProjectIcon project={project} />
                  <span className="project_nav-name">{project.name}</span>
                </Button>
                {iconButton(project)}
              </li>
            ))}
          </ul>
        </>
      )}

      <ProjectIconDialog
        project={iconFor && (projects.find((p) => p.id === iconFor.id) ?? null)}
        onClose={() => setIconFor(null)}
      />
    </div>
  )
}
