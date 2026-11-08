import { Button, Input, Select, FormError } from '@/components/ui'
import { useRef, useState } from 'react'
import { useUploadFiles, useWorkspace } from '@/api/workspace'
import { errorMessage } from '@/api/tables'
import { flattenFolders } from '@/data/folder'
import { DOC_TYPE_LABELS } from '@/data/document'
import { DOCUMENT_TEMPLATES, type DocumentTemplate } from '@/data/documentTemplate'
import { useNewDocument } from '@/hooks/useNewDocument'
import ImportCollection from '@/components/ImportCollection'
import type { Document } from '@/types'
import './CreateItem.scss'

export default function CreateItem({ folderId }: { folderId?: number }) {
  const { data: workspace } = useWorkspace()
  const newDocument = useNewDocument()
  const [destination, setDestination] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [importing, setImporting] = useState(false)
  const uploadFiles = useUploadFiles()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folders = flattenFolders(workspace?.folders ?? []).filter(f => !f.archived)
  const rootId = workspace?.root_folder_id ?? workspace?.folders?.[0]?.id
  const rootName = folders.find(f => f.id === rootId)?.name ?? 'Root'
  const targetFolder = folderId ?? (Number(destination) || rootId)
  async function make(type: Document['doc_type'], template?: DocumentTemplate) {
    setBusy(true); setError('')
    try {
      await newDocument(type, targetFolder, template)
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  return <div className="view-create_item">
    {!folderId && folders.length > 0 && <Select aria-label="Create in folder" className="create_item-folder" value={destination} onChange={e => setDestination(e.target.value)}>
      <option value="">{rootName}</option>
      {folders.filter(f => f.id !== rootId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
    </Select>}
    {(['document', 'spreadsheet', 'table'] as const).map(type => <Button variant="secondary" key={type} disabled={busy || !workspace} onClick={() => make(type)} className="create_item-button">New {DOC_TYPE_LABELS[type]}</Button>)}
    <Button variant="secondary" disabled={busy || !workspace || !targetFolder} onClick={() => setImporting(true)} className="create_item-button">Import Collection</Button>
    <Button variant="secondary" disabled={busy || !workspace} onClick={() => fileInputRef.current?.click()} className="create_item-button">Upload files</Button>
    <Input
      ref={fileInputRef}
      type="file"
      multiple
      aria-label="Choose files to upload"
      hidden
      onChange={async (e) => {
        const files = Array.from(e.target.files ?? [])
        e.target.value = ''
        if (!files.length || !targetFolder) return
        setBusy(true); setError('')
        try { await uploadFiles.mutateAsync({ folderId: targetFolder, files }) } catch (err) { setError(errorMessage(err)) } finally { setBusy(false) }
      }}
    />
    {DOCUMENT_TEMPLATES.map(template => <Button variant="secondary" key={template.id} disabled={busy || !workspace} onClick={() => make('document', template)} className="create_item-button">New {template.label}</Button>)}
    <FormError message={error} />
    {importing && targetFolder && <ImportCollection folderId={targetFolder} onClose={() => setImporting(false)} />}
  </div>
}
