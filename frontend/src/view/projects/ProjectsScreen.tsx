import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { FolderKanban, Loader2, Plus } from 'lucide-react'
import { Button, FormError, Input, Select } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import CreateItem from '@/components/CreateItem'
import DocTypeIcon from '@/components/DocTypeIcon'
import { useCreateFolder, useWorkspace } from '@/api/workspace'
import { errorMessage } from '@/api/tables'
import { PROJECT_TYPES, projectTypeLabel } from '@/data/projectType'
import { documentsIn, projectLastModified, projectsOf } from '@/data/folder'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { ProjectType } from '@/types'
import './ProjectsScreen.scss'

// The Space's projects, each with the docs inside it (including docs in its
// subfolders). A project is a folder with kind "project", so it also shows
// in the sidebar tree and opens on the folder page.
export default function ProjectsScreen() {
  usePageTitle('Projects')
  const { data: workspace, isLoading } = useWorkspace()
  const createFolder = useCreateFolder()
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const nameRef = useRef('')
  const [newType, setNewType] = useState<ProjectType>('blank')
  const projects = projectsOf(workspace?.folders ?? [])

  function commitAdd() {
    const name = nameRef.current.trim()
    setAdding(false)
    nameRef.current = ''
    if (!name) return
    setError('')
    createFolder.mutate({ name, kind: 'project', project_type: newType }, { onError: (e) => setError(errorMessage(e)) })
  }

  return (
    <WorkspaceLayout>
      <div className="view-projects">
        <div className="projects-header">
          <h1 className="projects-title">Projects</h1>
          <Button variant="primary" onClick={() => setAdding(true)} className="projects-new">
            <Plus className="projects-icon" aria-hidden="true" />
            New project
          </Button>
        </div>

        <div className="projects-body">
          <div className="projects-list">
            <FormError message={error} />
            {adding && (
              <div
                className="projects-new_row"
                onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) commitAdd() }}
              >
                <Input
                  autoFocus
                  aria-label="Project name"
                  placeholder="Project name"
                  onChange={(e) => { nameRef.current = e.target.value }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitAdd()
                    if (e.key === 'Escape') { nameRef.current = ''; setAdding(false) }
                  }}
                />
                <Select aria-label="Project type" value={newType} onChange={(e) => setNewType(e.target.value as ProjectType)}>
                  {PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </div>
            )}

            {isLoading && <Loader2 className="projects-icon projects-icon--spin" aria-label="Loading" />}

            {!isLoading && projects.length === 0 && !adding && (
              <div className="projects-empty">
                <FolderKanban className="projects-empty_icon" aria-hidden="true" />
                <p>No projects yet. A project groups the docs, sheets and collections for one piece of work.</p>
              </div>
            )}

            {projects.map((project) => {
              const docs = documentsIn(project)
              const modified = projectLastModified(project)
              return (
                <section key={project.id} className="projects-card" aria-labelledby={`project-${project.id}`}>
                  <div className="projects-card-top">
                    <FolderKanban className="projects-icon" aria-hidden="true" />
                    <h2 id={`project-${project.id}`} className="projects-card-title">
                      <Link to={`/folders/${project.id}`} className="projects-card-link">{project.name}</Link>
                    </h2>
                    {project.project_type && project.project_type !== 'blank' && (
                      <span className="projects-card-type">{projectTypeLabel(project.project_type)}</span>
                    )}
                    <span className="projects-card-meta">
                      {docs.length} {docs.length === 1 ? 'file' : 'files'}
                      {modified && ` · updated ${format(parseISO(modified), 'MMM d, yyyy')}`}
                    </span>
                  </div>

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
      </div>
    </WorkspaceLayout>
  )
}
