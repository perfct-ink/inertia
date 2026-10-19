import { useState } from 'react'
import { Button, Input, Modal } from '@/components/ui'
import DocTypeIcon from '@/components/DocTypeIcon'
import { useWorkspace } from '@/api/workspace'
import { searchSpaceFiles, spaceFiles } from '@/data/folder'
import './DocumentLinkPicker.scss'

// Search the Space's files and pick one to link to. Enter picks the first match.
export default function DocumentLinkPicker({ open, excludeId, onPick, onClose }: {
  open: boolean
  excludeId?: number
  onPick: (documentId: number) => void
  onClose: () => void
}) {
  const { data: workspace } = useWorkspace()
  const [query, setQuery] = useState('')
  const matches = searchSpaceFiles(spaceFiles(workspace?.folders ?? []), query).filter((f) => f.document.id !== excludeId).slice(0, 20)

  function pick(id: number) {
    setQuery('')
    onPick(id)
  }

  return (
    <Modal open={open} title="Link to a document" onClose={() => { setQuery(''); onClose() }}>
      <Input
        autoFocus
        type="search"
        aria-label="Search documents"
        placeholder="Search by name or folder"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && matches[0]) pick(matches[0].document.id) }}
      />
      <ul className="document_link_picker-list">
        {matches.length === 0 && <li>No matching documents.</li>}
        {matches.map(({ document, path }) => (
          <li key={document.id}>
            <Button variant="unstyled" className="document_link_picker-item" onClick={() => pick(document.id)}>
              <DocTypeIcon type={document.doc_type} />
              <span>{document.title}</span>
              {path.length > 0 && <span className="document_link_picker-path">{path.join(' / ')}</span>}
            </Button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
