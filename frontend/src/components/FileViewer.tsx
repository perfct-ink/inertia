import { useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { Button, FormError, Input, Select } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useUpdateDocument } from '@/api/documents'
import { useMoveDocument, useReplaceFile, useWorkspace } from '@/api/workspace'
import { errorMessage } from '@/util/errorMessage'
import { flattenFolders } from '@/data/folder'
import api from '@/lib/api'
import { filePreview, formatBytes } from '@/data/document'
import { useTabsStore } from '@/store/tabs'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { Document } from '@/types'
import './FileViewer.scss'

// An uploaded file as an item of its own: rename it, download it, and preview
// images, video and PDFs in place.
export default function FileViewer({ doc }: { doc: Document }) {
  usePageTitle(doc.title)
  const updateDocument = useUpdateDocument()
  const { updateTitle } = useTabsStore()
  const [title, setTitle] = useState(doc.title)
  const { data: workspace } = useWorkspace()
  const moveDocument = useMoveDocument()
  const replaceFile = useReplaceFile()
  const replaceInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const folders = flattenFolders(workspace?.folders ?? []).filter((f) => !f.archived)
  const file = doc.file
  const url = file ? `${api.defaults.baseURL ?? ''}${file.url}` : ''
  const preview = filePreview(file?.content_type)

  function rename() {
    const next = title.trim()
    if (!next || next === doc.title) { setTitle(doc.title); return }
    updateDocument.mutate({ id: doc.id, title: next }, { onSuccess: (saved) => updateTitle(String(doc.id), saved.title) })
  }

  return (
    <WorkspaceLayout>
      <div className="view-file_viewer">
        <div className="file_viewer-header">
          <Input
            aria-label="File name"
            className="file_viewer-name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={rename}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          />
          {file && (
            <a className="file_viewer-download" href={url} download={file.filename}>
              <Download className="file_viewer-icon" aria-hidden="true" /> Download
            </a>
          )}
        </div>
        <div className="file_viewer-actions">
          <label>
            Folder
            <Select
              aria-label="Folder"
              value={doc.folder_id}
              onChange={(e) => moveDocument.mutate({ id: doc.id, folderId: Number(e.target.value) }, { onError: (err) => setError(errorMessage(err)) })}
            >
              {folders.map((f) => <option key={f.id} value={f.id}>{f.root ? 'Root' : f.name}</option>)}
            </Select>
          </label>
          <Button variant="secondary" disabled={replaceFile.isPending} onClick={() => replaceInput.current?.click()}>Replace with a new version</Button>
          <Input
            ref={replaceInput}
            type="file"
            hidden
            aria-label="Choose the new version"
            onChange={(e) => {
              const picked = e.target.files?.[0]
              e.target.value = ''
              if (picked) replaceFile.mutate({ documentId: doc.id, file: picked }, { onError: (err) => setError(errorMessage(err)) })
            }}
          />
        </div>
        <FormError message={error} />
        {file && <p className="file_viewer-meta">{file.content_type || 'Unknown type'} · {formatBytes(file.byte_size)}</p>}
        {!file && <p className="file_viewer-meta">This file is not available.</p>}
        {file && preview === 'image' && <img className="file_viewer-image" src={url} alt={doc.title} />}
        {file && preview === 'video' && <video className="file_viewer-video" src={url} controls />}
        {file && preview === 'pdf' && <iframe className="file_viewer-pdf" src={url} title={doc.title} />}
        {file && preview === 'none' && <p className="file_viewer-meta">No preview for this type of file. Download it to open it.</p>}
        <Button variant="secondary" onClick={() => window.history.back()}>Back</Button>
      </div>
    </WorkspaceLayout>
  )
}
