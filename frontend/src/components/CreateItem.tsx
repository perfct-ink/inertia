import { Button, Select, FormError } from '@/components/ui'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateDocument, useWorkspace } from '@/api/workspace'
import { errorMessage } from '@/api/tables'
import { flattenFolders } from '@/data/folder'
import type { Document } from '@/types'
import './CreateItem.scss'

export default function CreateItem({ folderId }: { folderId?: number }) {
  const navigate = useNavigate()
  const { data: workspace } = useWorkspace()
  const create = useCreateDocument()
  const [destination, setDestination] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const folders = flattenFolders(workspace?.folders ?? []).filter(f => !f.archived)
  const rootId = workspace?.root_folder_id ?? workspace?.folders?.[0]?.id
  const rootName = folders.find(f => f.id === rootId)?.name ?? 'Root'
  async function make(type: Document['doc_type']) {
    setBusy(true); setError('')
    try {
      const target = folderId ?? (Number(destination) || rootId)
      if (!target) throw new Error('The space root is unavailable. Please try again.')
      const doc = await create.mutateAsync({ folderId: target, title: `Untitled ${type === 'spreadsheet' ? 'Sheet' : type === 'table' ? 'Table' : 'Document'}`, doc_type: type })
      navigate(`/documents/${doc.id}`)
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  return <div className="view-create_item">
    {!folderId && folders.length > 0 && <Select aria-label="Create in folder" className="create_item-folder" value={destination} onChange={e => setDestination(e.target.value)}>
      <option value="">{rootName}</option>
      {folders.filter(f => f.id !== rootId).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
    </Select>}
    {(['document', 'spreadsheet', 'table'] as const).map(type => <Button variant="secondary" key={type} disabled={busy || !workspace} onClick={() => make(type)} className="create_item-button">New {type === 'spreadsheet' ? 'Sheet' : type === 'table' ? 'Table' : 'Document'}</Button>)}
    <FormError message={error} />
  </div>
}
