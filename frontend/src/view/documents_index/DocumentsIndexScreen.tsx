import { Button } from '@/components/ui'
import { Database } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { FileText, Table as TableIcon, Loader2, ArrowUp, ArrowDown } from 'lucide-react'
import { useWorkspace } from '@/api/workspace'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import CreateItem from '@/components/CreateItem'
import { flattenFolders } from '@/data/folder'
import './DocumentsIndexScreen.scss'
import type { Document } from '@/types'
import { usePageTitle } from '@/hooks/usePageTitle'
import { lastModified } from '@/data/document'

type Row = Document & { folderId: number; folderName: string }
type SortKey = 'name' | 'location' | 'modified'

// A file manager's list view: sortable Name/Location/Last Modified columns,
// full width instead of a centered single-item-per-row list.
export default function DocumentsIndexScreen() {
  usePageTitle('Documents')
  const navigate = useNavigate()
  const { data: workspace, isLoading } = useWorkspace()
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const allDocs: Row[] =
    flattenFolders(workspace?.folders ?? []).flatMap((f) =>
      (f.documents ?? []).map((d) => ({ ...d, folderId: f.id, folderName: f.name }))
    )

  const sortedDocs = useMemo(() => {
    const factor = sortDir === 'asc' ? 1 : -1
    return [ ...allDocs ].sort((a, b) => {
      if (sortKey === 'name') return a.title.localeCompare(b.title) * factor
      if (sortKey === 'location') return a.folderName.localeCompare(b.folderName) * factor
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
          <h1 className="documents_index-title">Documents, Sheets & Tables</h1>
          <div className="documents_index-create"><CreateItem /></div>

          {isLoading && (
            <div className="documents_index-loading">
              <Loader2 className="documents_index-spinner" />
            </div>
          )}

          {!isLoading && allDocs.length === 0 && (
            <p className="documents_index-empty">No documents yet.</p>
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
                    {doc.doc_type === 'table'
                      ? <Database className="documents_index-icon" />
                      : doc.doc_type === 'spreadsheet'
                      ? <TableIcon className="documents_index-icon" />
                      : <FileText className="documents_index-icon" />
                    }
                    <Button
                      onClick={() => navigate(`/documents/${doc.id}`)}
                      className="documents_index-link"
                    >
                      {doc.title}
                    </Button>
                    <Button
                      onClick={() => navigate(`/folders/${doc.folderId}`)}
                      className="documents_index-location"
                    >
                      {doc.folderName}
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
