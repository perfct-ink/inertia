import { useEffect, useMemo, useState } from 'react'
import { Button, FormError, Input, Modal } from '@/components/ui'
import DocTypeIcon from '@/components/DocTypeIcon'
import { useWorkspace } from '@/api/workspace'
import { linkableFiles } from '@/data/documentLink'
import './DocumentLinkPicker.scss'

// Search the Space's files and pick one to link to. Enter picks the first match.
// Opened from the toolbar button, or by typing "[[" or "@" in the document.
export default function DocumentLinkPicker({ open, excludeId, onPick, onClose }: {
  open: boolean
  // The document being edited, which is left out of the list.
  excludeId?: number
  onPick: (documentId: number) => void
  onClose: () => void
}) {
  const { data: workspace, isError, isLoading } = useWorkspace()
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const matches = useMemo(() => linkableFiles(workspace?.folders ?? [], query, excludeId), [workspace, query, excludeId])

  return (
    <Modal open={open} title="Link to a document" description="Choose the file to link to. Its title in the link follows renames." onClose={onClose}>
      <Input
        autoFocus
        type="search"
        aria-label="Search documents"
        placeholder="Search by name or folder"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && matches[0]) onPick(matches[0].document.id) }}
      />
      {isError && <FormError message="Could not load the Space's documents. Try again." />}
      {isLoading && <p role="status" className="document_link_picker-empty">Loading documents…</p>}
      {!isLoading && !isError && matches.length === 0 && <p className="document_link_picker-empty">No matching documents.</p>}
      <ul className="document_link_picker-list">
        {matches.map(({ document, path }) => (
          <li key={document.id}>
            <Button variant="unstyled" className="document_link_picker-item" onClick={() => onPick(document.id)}>
              <DocTypeIcon type={document.doc_type} className="document_link_picker-icon" />
              <span className="document_link_picker-text">{document.title || 'Untitled'}</span>
              {path.length > 0 && <span className="document_link_picker-path">{path.join(' / ')}</span>}
            </Button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
