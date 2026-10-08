import { Database } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { FileText, Table as TableIcon, Loader2, ArrowUp, ArrowDown } from 'lucide-react'
import { useWorkspace } from '@/api/workspace'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import CreateItem from '@/components/CreateItem'
import type { Document, Folder } from '@/types'

type Row = Document & { folderId: number; folderName: string }
type SortKey = 'name' | 'location' | 'modified'

function lastModified(doc: Document) {
  return doc.content_updated_at ?? doc.updated_at
}

// A file manager's list view: sortable Name/Location/Last Modified columns,
// full width instead of a centered single-item-per-row list.
export default function DocumentsIndexPage() {
  const navigate = useNavigate()
  const { data: workspace, isLoading } = useWorkspace()
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function flatten(folders: Folder[]): Folder[] { return folders.flatMap(f => [f, ...flatten(f.children ?? [])]) }
  const allDocs: Row[] =
    flatten(workspace?.folders ?? []).flatMap((f) =>
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
      <button
        onClick={() => toggleSort(sortKeyName)}
        className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider hover:text-foreground ${active ? 'text-foreground' : 'text-muted-foreground'} ${className ?? ''}`}
      >
        {label}
        {active && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </button>
    )
  }

  return (
    <WorkspaceLayout>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-8 px-6">
          <h1 className="text-2xl font-semibold mb-4">Documents, Sheets & Tables</h1>
          <div className="mb-6"><CreateItem /></div>

          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && allDocs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">No documents yet.</p>
          )}

          {!isLoading && allDocs.length > 0 && (
            <div className="flex flex-col">
              <div className="flex items-center gap-3 py-2 px-2 border-b">
                <span className="w-4 shrink-0" />
                <SortHeader sortKeyName="name" label="Name" className="flex-1" />
                <SortHeader sortKeyName="location" label="Location" className="w-32 shrink-0" />
                <SortHeader sortKeyName="modified" label="Last Modified" className="w-36 shrink-0" />
              </div>
              <div className="flex flex-col divide-y">
                {sortedDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 py-2.5 hover:bg-accent rounded-md px-2 group">
                    {doc.doc_type === 'table'
                      ? <Database className="w-4 h-4 text-muted-foreground shrink-0" />
                      : doc.doc_type === 'spreadsheet'
                      ? <TableIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    }
                    <button
                      onClick={() => navigate(`/documents/${doc.id}`)}
                      className="flex-1 text-sm font-medium truncate text-left hover:underline"
                    >
                      {doc.title}
                    </button>
                    <button
                      onClick={() => navigate(`/folders/${doc.folderId}`)}
                      className="w-32 shrink-0 text-xs text-muted-foreground truncate text-left hover:underline"
                    >
                      {doc.folderName}
                    </button>
                    <span className="w-36 shrink-0 text-xs text-muted-foreground">
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
