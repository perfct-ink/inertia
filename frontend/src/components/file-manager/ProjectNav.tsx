import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Archive, ArchiveRestore, BookmarkPlus, Database, FilePlus, FolderPlus, Table as SheetIcon, ChevronsUpDown, Folder as FolderIcon, FolderKanban, FileText,
  LayoutDashboard, Plus, Smile,
} from 'lucide-react'
import { Button, FormError, Input, Menu, classNames } from '@/components/ui'
import ProjectIcon from '@/components/project/ProjectIcon'
import ProjectIconDialog from '@/components/project/ProjectIconDialog'
import NewProjectDialog from '@/components/project/NewProjectDialog'
import SaveProjectTypeDialog from '@/components/project/SaveProjectTypeDialog'
import { useWorkspace } from '@/api/workspace'
import { useArchivedFolders, useCreateFolder, useUpdateFolder } from '@/api/folders'
import { errorMessage } from '@/api/tables'
import { documentsIn, folderOfDocument, projectOf, projectsOf } from '@/data/folder'
import { useSelectProject } from '@/hooks/useSelectProject'
import { useOpenProject } from '@/hooks/useOpenProject'
import { TASKS_HEADING, TASK_SECTIONS } from './projectSections'
import { isActivePath } from '@/data/project'
import { useNewDocument } from '@/hooks/useNewDocument'
import { shortcutLabel } from '@/util/shortcuts'
import type { Document } from '@/types'
import { useProjectStore } from '@/store/projects'
import type { Folder } from '@/types'
import { FolderItem } from './FolderItem'
import './ProjectNav.scss'

// The Space's projects as a flat list; selecting one switches the sidebar to
// that project's files, with a way back to the list. Its pages are on the
// icon rail (SidebarRail).
export function ProjectNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: workspace } = useWorkspace()
  const createFolder = useCreateFolder()
  const selectProject = useSelectProject()
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const openProject = useOpenProject()
  const [creating, setCreating] = useState(false)
  const [savingType, setSavingType] = useState<Folder | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const { data: archivedFolders = [] } = useArchivedFolders()
  const updateFolder = useUpdateFolder()
  const newDocument = useNewDocument()
  const [addingFolder, setAddingFolder] = useState(false)
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

  async function createIn(project: Folder, type: Document['doc_type']) {
    setError('')
    try {
      await newDocument(type, project.id)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  function addFolder(project: Folder, name: string) {
    setAddingFolder(false)
    if (!name) return
    setError('')
    createFolder.mutate({ name, parent_id: project.id }, { onError: (e) => setError(errorMessage(e)) })
  }

  const iconButton = (project: Folder) => (
    <Button title="Change icon" aria-label={`Change icon for ${project.name}`} onClick={() => setIconFor(project)} className="project_nav-action">
      <Smile className="project_nav-icon" />
    </Button>
  )

  return (
    <div className="view-project_nav">
      {openProject ? (
        <>
          {/* Like the Space switcher: the open project opens a menu to switch
              projects, open its overview, start one, change its icon or see
              them all. */}
          <div className="project_nav-switcher">
            <Menu
              label={`Project: ${openProject.name}. Switch project`}
              triggerClassName="workspace_switcher-trigger"
              items={[
                ...projects.map((project) => ({
                  key: `project-${project.id}`,
                  label: project.name,
                  icon: <ProjectIcon project={project} />,
                  checked: project.id === openProject.id,
                  onSelect: () => open(project),
                })),
                { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="project_nav-icon" />, separatorBefore: true, onSelect: () => navigate(`/folders/${openProject.id}`) },
                { key: 'new', label: 'New project...', icon: <Plus className="project_nav-icon" />, onSelect: () => setCreating(true) },
                { key: 'save-type', label: 'Save as type...', icon: <BookmarkPlus className="project_nav-icon" />, onSelect: () => setSavingType(openProject) },
                { key: 'icon', label: 'Change icon...', icon: <Smile className="project_nav-icon" />, onSelect: () => setIconFor(openProject) },
                { key: 'all', label: 'All projects', icon: <FolderKanban className="project_nav-icon" />, onSelect: () => navigate('/space') },
              ]}
            >
              <ProjectIcon project={openProject} />
              <span className="workspace_switcher-text">
                <span className="workspace_switcher-name">{openProject.name}</span>
              </span>
              <ChevronsUpDown className="workspace_switcher-icon" aria-hidden="true" />
            </Menu>
          </div>
          {/* The task pages, only inside a project. */}
          <nav aria-label="Tasks" className="project_nav-tasks">
            <span className="project_nav-label">{TASKS_HEADING}</span>
            {TASK_SECTIONS.map(({ label, path, icon: Icon }) => {
              const active = isActivePath(location.pathname, path)
              return (
                <Link key={path} to={path} aria-current={active ? 'page' : undefined} className={classNames('project_nav-row', 'project_nav-open', active && 'project_nav-row--active')}>
                  <Icon className="project_nav-icon" />
                  <span className="project_nav-name">{label}</span>
                </Link>
              )
            })}
          </nav>
          {/* The project's documents, sheets, Collections and files, subfolders included. */}
          <div className="project_nav-files">
            <div className="project_nav-bar">
              {/* The project's files, filtered to it; the page lists them all. */}
              <Button
                onClick={() => navigate('/documents')}
                aria-current={location.pathname === '/documents' ? 'page' : undefined}
                className={classNames('project_nav-label', location.pathname === '/documents' && 'project_nav-label--active')}
              >
                All files
              </Button>
              <div className="project_nav-tools">
                <Button title={`New document (${shortcutLabel('⌘N')})`} aria-label="New document" onClick={() => createIn(openProject, 'document')} className="project_nav-tool">
                  <FilePlus className="project_nav-icon" />
                </Button>
                <Button title={`New sheet (${shortcutLabel('⌘⇧N')})`} aria-label="New sheet" onClick={() => createIn(openProject, 'spreadsheet')} className="project_nav-tool">
                  <SheetIcon className="project_nav-icon" />
                </Button>
                <Button title="New Collection" aria-label="New Collection" onClick={() => createIn(openProject, 'table')} className="project_nav-tool">
                  <Database className="project_nav-icon" />
                </Button>
                <Button title="New folder" aria-label="New folder" onClick={() => setAddingFolder(true)} className="project_nav-tool">
                  <FolderPlus className="project_nav-icon" />
                </Button>
              </div>
            </div>
            <FormError message={error} />
            {addingFolder && (
              <div className="project_nav-new">
                <Input
                  autoFocus
                  aria-label="Folder name"
                  placeholder="Folder name"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addFolder(openProject, e.currentTarget.value.trim())
                    if (e.key === 'Escape') setAddingFolder(false)
                  }}
                  onBlur={(e) => addFolder(openProject, e.currentTarget.value.trim())}
                />
              </div>
            )}
            {documentsIn(openProject).length === 0 && !openProject.children?.length
              ? <p className="project_nav-note">No files yet.</p>
              : <FolderItem folder={openProject} bare />}
          </div>
        </>
      ) : (
        <>
          <div className="project_nav-bar">
            <Button onClick={() => navigate('/space')} className="project_nav-label">Projects</Button>
            <div className="project_nav-tools">
              <Button title="All files" aria-label="All files" onClick={() => { selectProject(null); navigate('/documents') }} className={classNames('project_nav-tool', location.pathname === '/documents' && 'project_nav-tool--active')}>
                <FileText className="project_nav-icon" />
              </Button>
              <Button
                title={showArchived ? 'Show projects' : 'Show archived'}
                aria-label={showArchived ? 'Show projects' : 'Show archived'}
                aria-pressed={showArchived}
                onClick={() => setShowArchived((on) => !on)}
                className={classNames('project_nav-tool', showArchived && 'project_nav-tool--active')}
              >
                <Archive className="project_nav-icon" />
              </Button>
              <Button title="New project" aria-label="New project" onClick={() => setCreating(true)} className="project_nav-tool">
                <Plus className="project_nav-icon" />
              </Button>
            </div>
          </div>

          <FormError message={error} />
          {workspace && projects.length === 0 && (
            <p className="project_nav-note">No projects yet.</p>
          )}

          {showArchived ? (
            <div className="sidebar-archived">
              {archivedFolders.length === 0 && <p className="project_nav-note">Nothing archived.</p>}
              {archivedFolders.map((folder) => (
                <div key={folder.id} className="sidebar-archived_row">
                  {folder.kind === 'project' ? <ProjectIcon project={folder} /> : <FolderIcon className="project_nav-icon" />}
                  <Button onClick={() => navigate(`/folders/${folder.id}`)} className="sidebar-archived_open">{folder.name}</Button>
                  <Button onClick={() => updateFolder.mutate({ id: folder.id, archived: false })} title="Unarchive" aria-label={`Unarchive ${folder.name}`} className="sidebar-unarchive">
                    <ArchiveRestore className="project_nav-icon" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
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
          )}
        </>
      )}

      {creating && <NewProjectDialog onClose={() => setCreating(false)} onCreated={open} />}
      {savingType && <SaveProjectTypeDialog project={savingType} onClose={() => setSavingType(null)} />}
      <ProjectIconDialog
        project={iconFor && (projects.find((p) => p.id === iconFor.id) ?? null)}
        onClose={() => setIconFor(null)}
      />
    </div>
  )
}
