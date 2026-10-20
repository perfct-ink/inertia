import { Button, Input } from '@/components/ui'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Loader2, ArrowUp, ArrowDown, FolderKanban } from 'lucide-react'
import DocTypeIcon from '@/components/DocTypeIcon'
import { useWorkspace } from '@/api/workspace'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import CreateItem from '@/components/CreateItem'
import FilesGallery from '@/components/FilesGallery'
import { spaceFiles, searchSpaceFiles } from '@/data/folder'
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
  const [mode, setMode] = useState<'list' | 'gallery'>('list')

  const files = spaceFiles(workspace?.folders ?? [])
  const allDocs: Row[] = searchSpaceFiles(files, query).map((f) => ({
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

          <div className="documents_index-modes" role="group" aria-label="View">
            <Button aria-pressed={mode === 'list'} onClick={() => setMode('list')}>List</Button>
            <Button aria-pressed={mode === 'gallery'} onClick={() => setMode('gallery')}>Gallery</Button>
          </div>
          {mode === 'gallery' && <FilesGallery documents={sortedDocs} />}

          {isLoading && (
            <div className="documents_index-loading">
              <Loader2 className="documents_index-spinner" />
            </div>
          )}

          {mode === 'list' && !isLoading && allDocs.length === 0 && (
            <p className="documents_index-empty">{files.length ? 'No files match your search.' : 'No files in this Space yet.'}</p>
          )}

          {mode === 'list' && !isLoading && allDocs.length > 0 && (
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
