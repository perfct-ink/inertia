import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateDocument, useCreateFolder, useWorkspace } from '@/api/workspace'
import { errorMessage } from '@/api/tables'
import type { Document, Folder } from '@/types'

export default function CreateItem({ folderId }: { folderId?: number }) {
  const navigate = useNavigate()
  const { data: workspace } = useWorkspace()
  const create = useCreateDocument()
  const createFolder = useCreateFolder()
  const [destination, setDestination] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  function flatten(folders: Folder[]): Folder[] { return folders.flatMap(f => [f, ...flatten(f.children ?? [])]) }
  const folders = flatten(workspace?.folders ?? []).filter(f => !f.archived)
  async function make(type: Document['doc_type']) {
    setBusy(true); setError('')
    try {
      const target = folderId ?? (Number(destination) || folders[0]?.id) ?? (await createFolder.mutateAsync({ name: 'Documents' })).id
      const doc = await create.mutateAsync({ folderId: target, title: `Untitled ${type === 'spreadsheet' ? 'Sheet' : type === 'table' ? 'Table' : 'Document'}`, doc_type: type })
      navigate(`/documents/${doc.id}`)
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  return <div className="flex flex-wrap items-center gap-2 text-sm">
    {!folderId && folders.length > 0 && <select aria-label="Create in folder" className="bg-background border rounded px-2 py-1.5 max-w-40" value={destination} onChange={e => setDestination(e.target.value)}>
      <option value="">{folders[0].name}</option>
      {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
    </select>}
    {(['document', 'spreadsheet', 'table'] as const).map(type => <button key={type} disabled={busy} onClick={() => make(type)} className="border rounded px-3 py-1.5 hover:bg-accent disabled:opacity-50">New {type === 'spreadsheet' ? 'Sheet' : type === 'table' ? 'Table' : 'Document'}</button>)}
    {error && <p role="alert" className="text-red-500">{error}</p>}
  </div>
}
