import { Link } from 'react-router-dom'
import { Link2 } from 'lucide-react'
import { useBacklinks } from '@/api/documents'
import { useWorkspace } from '@/api/workspace'
import DocTypeIcon from '@/components/DocTypeIcon'
import { backlinkLocation, backlinksTitle } from '@/data/backlink'
import './DocumentBacklinks.scss'

// "Linked from": the documents in the Space that link to this one, below the
// document. Hidden while loading and when nothing links here. A failed load is
// reported by the API client's error notice. `bar` is for screens that fill the
// page and scroll inside (a sheet, a Collection): the panel sits under the content
// at its own height, scrolling itself when tall, instead of in the page's scroll.
export default function DocumentBacklinks({ documentId, bar }: { documentId: number; bar?: boolean }) {
  const { data: documents = [] } = useBacklinks(documentId)
  const { data: workspace } = useWorkspace()
  if (documents.length === 0) return null

  return (
    // The panel opens its own links; the editor area around it must not also react to the click.
    <section className={bar ? 'document_backlinks document_backlinks--bar' : 'document_backlinks'} aria-label="Linked from" onClick={(e) => e.stopPropagation()}>
      <h2 className="document_backlinks-title"><Link2 className="document_backlinks-icon" aria-hidden="true" /> {backlinksTitle(documents.length)}</h2>
      <ul className="document_backlinks-list">
        {documents.map((doc) => {
          const location = backlinkLocation(workspace?.folders ?? [], doc)
          return (
            <li key={doc.id}>
              <Link to={`/documents/${doc.id}`} className="document_backlinks-link">
                <DocTypeIcon type={doc.doc_type} className="document_backlinks-icon" />
                <span className="document_backlinks-text">{doc.title || 'Untitled'}</span>
                {location && <span className="document_backlinks-location">{location}</span>}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
