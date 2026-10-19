import { Button, Input, Select } from '@/components/ui'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Loader2, ArrowUp, ArrowDown, FolderKanban } from 'lucide-react'
import DocTypeIcon from '@/components/DocTypeIcon'
import { useWorkspace } from '@/api/workspace'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import CreateItem from '@/components/CreateItem'
import { spaceFiles, searchSpaceFiles, filterSpaceFiles, projectsOf, type SpaceFileFilters } from '@/data/folder'
import { useWorkspaceMembers } from '@/api/workspaces'
import { useWorkspaceStore } from '@/store/workspaces'
import { DOC_TYPE_LABELS } from '@/data/document'
import './DocumentsIndexScreen.scss'
import type { Document } from '@/types'
import { usePageTitle } from '@/hooks/usePageTitle'
import { lastModified } from '@/data/document'

type Row = Document & { folderId: number; location: string; inProject: boolean }
type SortKey = 'name' | 'location' | 'modified'

// Every file in the current Space, wherever it is nested: a file manager's
// list view with search and sortable Name/Location/Last Modified columns.
export default function DocumentsIndexScreen() {
  usePageTitle('All files')
  const navigate = useNavigate()
  const { data: workspace, isLoading } = useWorkspace()
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [query, setQuery] = useState('')
  // '' means "any"; the project filter's '0' is files outside every project.
  const [projectFilter, setProjectFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const workspaceId = useWorkspaceStore((st) => st.activeWorkspaceId) ?? 0
  const { data: members = [] } = useWorkspaceMembers(workspaceId)
  const filters: SpaceFileFilters = {
    projectId: projectFilter === '' ? undefined : Number(projectFilter),
    docType: (typeFilter || undefined) as SpaceFileFilters['docType'],
    ownerId: ownerFilter === '' ? undefined : Number(ownerFilter),
  }
  const projects = projectsOf(workspace?.folders ?? [])

  const files = spaceFiles(workspace?.folders ?? [])
  const allDocs: Row[] = filterSpaceFiles(searchSpaceFiles(files, query), filters).map((f) => ({
    ...f.document,
    folderId: f.folder.id,
    location: f.path.length ? f.path.join(' / ') : f.folder.name,
    inProject: f.project != null,
  }))

  const sortedDocs = useMemo(() => {
    const factor = sortDir === 'asc' ? 1 : -1
    return [ ...allDocs ].sort((a, b) => {
      if (sortKey === 'name') return a.title.localeCompare(b.title) * factor
      if (sortKey === 'location') return a.location.localeCompare(b.location) * factor
      return (new Date(lastModified(a)).getTime() - new Date(lastModified(b)).getTime()) * factor
    })
  }, [allDocs, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'modified' ? 'desc' : 'asc')
    }
  }

  function SortHeader({ sortKeyName, label, className }: { sortKeyName: SortKey; label: string; className?: string }) {
    const active = sortKey === sortKeyName
    return (
      <Button
        onClick={() => toggleSort(sortKeyName)}
        className={`documents_index-sort${active ? ' documents_index-sort--active' : ''} ${className ?? ''}`}
      >
        {label}
        {active && (sortDir === 'asc' ? <ArrowUp className="documents_index-sort_icon" /> : <ArrowDown className="documents_index-sort_icon" />)}
      </Button>
    )
  }

  return (
    <WorkspaceLayout>
      <div className="view-documents_index">
        <div className="documents_index-content">
          <h1 className="documents_index-title">All files</h1>
          <div className="documents_index-create"><CreateItem /></div>
          <Input
            type="search"
            aria-label="Search files"
            placeholder="Search by name or folder"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="documents_index-search"
          />

          <div className="documents_index-filters">
            <Select aria-label="Filter by project" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
              <option value="">All projects</option>
              <option value="0">No project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Select aria-label="Filter by type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              {Object.entries(DOC_TYPE_LABELS).map(([type, label]) => <option key={type} value={type}>{label}</option>)}
            </Select>
            <Select aria-label="Filter by owner" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
              <option value="">Any owner</option>
              {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.user.name}</option>)}
            </Select>
          </div>

          {isLoading && (
            <div className="documents_index-loading">
              <Loader2 className="documents_index-spinner" />
            </div>
          )}

          {!isLoading && allDocs.length === 0 && (
            <p className="documents_index-empty">{files.length ? 'No files match your search.' : 'No files in this Space yet.'}</p>
          )}

          {!isLoading && allDocs.length > 0 && (
            <div className="documents_index-table">
              <div className="documents_index-head">
                <span className="documents_index-spacer" />
                <SortHeader sortKeyName="name" label="Name" className="documents_index-col--name" />
                <SortHeader sortKeyName="location" label="Location" className="documents_index-col--location" />
                <SortHeader sortKeyName="modified" label="Last Modified" className="documents_index-col--modified" />
              </div>
              <div className="documents_index-rows">
                {sortedDocs.map((doc) => (
                  <div key={doc.id} className="documents_index-row">
                    <DocTypeIcon type={doc.doc_type} className="documents_index-icon" />
                    <Button
                      onClick={() => navigate(`/documents/${doc.id}`)}
                      className="documents_index-link"
                    >
                      {doc.title}
                    </Button>
                    <Button
                      onClick={() => navigate(`/folders/${doc.folderId}`)}
                      title={doc.location}
                      className="documents_index-location"
                    >
                      {doc.inProject && <FolderKanban className="documents_index-sort_icon" aria-label="Project" />}
                      <span className="documents_index-location_text">{doc.location}</span>
                    </Button>
                    <span className="documents_index-modified">
                      {format(parseISO(lastModified(doc)), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  )
}
