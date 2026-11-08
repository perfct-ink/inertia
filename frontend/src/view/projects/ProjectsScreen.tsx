import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { BookmarkPlus, Briefcase, FolderKanban, Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import CreateItem from '@/components/CreateItem'
import ProjectDetails from '@/components/ProjectDetails'
import DocTypeIcon from '@/components/DocTypeIcon'
import ProjectIcon from '@/components/project/ProjectIcon'
import ProjectIconDialog from '@/components/project/ProjectIconDialog'
import NewProjectDialog from '@/components/project/NewProjectDialog'
import SaveProjectTypeDialog from '@/components/project/SaveProjectTypeDialog'
import type { Folder } from '@/types'
import { useWorkspace } from '@/api/workspace'
import { documentsIn, projectLastModified, projectsOf } from '@/data/folder'
import { usePageTitle } from '@/hooks/usePageTitle'
import './ProjectsScreen.scss'

// The Space's home page (/space): its projects, each with the docs inside it
// (including docs in its subfolders). A project is a folder with kind
// "project", so it also shows in the sidebar tree and opens on the folder
// page, which holds its documents, files, collections, tasks and events.
export default function ProjectsScreen() {
  usePageTitle('Projects')
  const { data: workspace, isLoading } = useWorkspace()
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()
  const [iconFor, setIconFor] = useState<Folder | null>(null)
  const [typeFor, setTypeFor] = useState<Folder | null>(null)
  const projects = projectsOf(workspace?.folders ?? [])

  return (
    <WorkspaceLayout>
      <div className="view-projects">
        <div className="projects-header">
          <h1 className="projects-title">Projects</h1>
          {projects.length > 0 && (
            <Button variant="secondary" onClick={() => navigate('/portfolio')} className="projects-new">
              <Briefcase className="projects-icon" aria-hidden="true" />
              Portfolio
            </Button>
          )}
          <Button variant="primary" onClick={() => setCreating(true)} className="projects-new">
            <Plus className="projects-icon" aria-hidden="true" />
            New project
          </Button>
        </div>

        <div className="projects-body">
          <div className="projects-list">
            {isLoading && <Loader2 className="projects-icon projects-icon--spin" aria-label="Loading" />}

            {!isLoading && projects.length === 0 && (
              <div className="projects-empty">
                <FolderKanban className="projects-empty_icon" aria-hidden="true" />
                <p>No projects yet. A project holds the documents, files, collections, tasks and events for one piece of work.</p>
              </div>
            )}

            {projects.map((project) => {
              const docs = documentsIn(project)
              const modified = projectLastModified(project)
              return (
                <section key={project.id} className="projects-card" aria-labelledby={`project-${project.id}`}>
                  <div className="projects-card-top">
                    <Button onClick={() => setIconFor(project)} aria-label={`Change icon for ${project.name}`} title="Change icon" className="projects-card-icon">
                      <ProjectIcon project={project} size="lg" />
                    </Button>
                    <h2 id={`project-${project.id}`} className="projects-card-title">
                      <Link to={`/folders/${project.id}`} className="projects-card-link">{project.name}</Link>
                    </h2>
                    <Button onClick={() => setTypeFor(project)} aria-label={`Save ${project.name} as a project type`} title="Save as project type" className="projects-card-action">
                      <BookmarkPlus className="projects-icon" aria-hidden="true" />
                    </Button>
                    <span className="projects-card-meta">
                      {docs.length} {docs.length === 1 ? 'file' : 'files'}
                      {modified && ` · updated ${format(parseISO(modified), 'MMM d, yyyy')}`}
                    </span>
                  </div>

                  <ProjectDetails project={project} />

                  {docs.length > 0 && (
                    <ul className="projects-docs">
                      {docs.map((doc) => (
                        <li key={doc.id}>
                          <Link to={`/documents/${doc.id}`} className="projects-doc">
                            <DocTypeIcon type={doc.doc_type} className="projects-doc-icon" />
                            <span className="projects-doc-title">{doc.title}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}

                  <CreateItem folderId={project.id} />
                </section>
              )
            })}
          </div>
        </div>
        {creating && <NewProjectDialog onClose={() => setCreating(false)} />}
        {typeFor && <SaveProjectTypeDialog project={typeFor} onClose={() => setTypeFor(null)} />}
        <ProjectIconDialog project={iconFor && (projects.find((p) => p.id === iconFor.id) ?? null)} onClose={() => setIconFor(null)} />
      </div>
    </WorkspaceLayout>
  )
}
