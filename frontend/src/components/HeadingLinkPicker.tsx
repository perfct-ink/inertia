import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button, FormError, Input, Modal } from '@/components/ui'
import DocTypeIcon from '@/components/DocTypeIcon'
import { useDocument } from '@/api/documents'
import { useWorkspace } from '@/api/workspace'
import { searchSpaceFiles, spaceFiles, type SpaceFile } from '@/data/folder'
import { linkableHeadings, type HeadingLink, type HeadingTarget } from '@/data/heading'
import './HeadingLinkPicker.scss'

const MAX_MATCHES = 20

// The headings of one document, to pick from. The document being edited is read
// from the editor (its saved copy can lag behind what is on screen); any other
// is fetched, and a failed fetch is reported to the user.
function HeadingList({ documentId, title, isCurrent, currentContent, onBack, onPick }: {
  documentId: number
  title: string
  isCurrent: boolean
  currentContent: Record<string, unknown> | null
  onBack: () => void
  onPick: (picked: HeadingLink) => void
}) {
  const remote = useDocument(isCurrent ? 0 : documentId)
  const headings: HeadingTarget[] = useMemo(
    () => linkableHeadings(isCurrent ? currentContent : remote.data?.content),
    [isCurrent, currentContent, remote.data?.content],
  )
  const topLevel = Math.min(...headings.map((h) => h.level))
  const loading = !isCurrent && remote.isLoading

  return (
    <>
      <p className="heading_link_picker-document">{title}</p>
      {loading && (
        <p role="status" className="heading_link_picker-empty">
          <Loader2 className="heading_link_picker-spinner" aria-hidden="true" /> Loading headings
        </p>
      )}
      {!isCurrent && remote.isError && <FormError message="Could not load this document. Try again." />}
      {!loading && !remote.isError && headings.length === 0 && (
        <p className="heading_link_picker-empty">This document has no headings to link to yet.</p>
      )}
      <ul className="heading_link_picker-list">
        {headings.map((heading) => (
          <li key={heading.anchor}>
            <Button
              variant="unstyled"
              className={`heading_link_picker-item heading_link_picker-item--depth_${Math.min(heading.level - topLevel, 4)}`}
              onClick={() => onPick({ documentId, anchor: heading.anchor, text: heading.text })}
            >
              <span className="heading_link_picker-text">{heading.text}</span>
            </Button>
          </li>
        ))}
      </ul>
      <div className="ui-modal-actions heading_link_picker-actions">
        <Button type="button" variant="secondary" onClick={onBack}>
          <ArrowLeft className="heading_link_picker-icon" aria-hidden="true" /> Back
        </Button>
      </div>
    </>
  )
}

// Two steps in one dialog: search the Space's documents, then pick one of that
// document's headings. Enter in the search picks the first match.
export default function HeadingLinkPicker({ open, currentDocumentId, currentContent, onPick, onClose }: {
  open: boolean
  currentDocumentId: number
  // The content of the document being edited, as the editor holds it now.
  currentContent: Record<string, unknown> | null
  onPick: (picked: HeadingLink) => void
  onClose: () => void
}) {
  const { data: workspace } = useWorkspace()
  const [query, setQuery] = useState('')
  const [chosen, setChosen] = useState<SpaceFile | null>(null)

  useEffect(() => {
    if (!open) { setQuery(''); setChosen(null) }
  }, [open])

  // Only documents have headings (not sheets or Collections); this one comes first.
  const matches = useMemo(() => {
    const docs = spaceFiles(workspace?.folders ?? []).filter((f) => f.document.doc_type === 'document')
    const found = searchSpaceFiles(docs, query)
    return [...found.filter((f) => f.document.id === currentDocumentId), ...found.filter((f) => f.document.id !== currentDocumentId)]
      .slice(0, MAX_MATCHES)
  }, [workspace, query, currentDocumentId])

  return (
    <Modal
      open={open}
      title="Link to a heading"
      description={chosen ? 'Choose the heading to link to.' : 'Choose the document the heading is in.'}
      onClose={onClose}
    >
      {chosen ? (
        <HeadingList
          documentId={chosen.document.id}
          title={chosen.document.title}
          isCurrent={chosen.document.id === currentDocumentId}
          currentContent={currentContent}
          onBack={() => setChosen(null)}
          onPick={onPick}
        />
      ) : (
        <>
          <Input
            autoFocus
            type="search"
            aria-label="Search documents"
            placeholder="Search by name or folder"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && matches[0]) setChosen(matches[0]) }}
          />
          {matches.length === 0 ? <p className="heading_link_picker-empty">No matching documents.</p> : (
            <ul className="heading_link_picker-list">
              {matches.map((file) => (
                <li key={file.document.id}>
                  <Button variant="unstyled" className="heading_link_picker-item" onClick={() => setChosen(file)}>
                    <DocTypeIcon type={file.document.doc_type} className="heading_link_picker-icon" />
                    <span className="heading_link_picker-text">{file.document.title}</span>
                    <span className="heading_link_picker-path">
                      {file.document.id === currentDocumentId ? 'This document' : file.path.join(' / ')}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Modal>
  )
}
