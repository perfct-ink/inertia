import { Link } from 'react-router-dom'
import { Link2 } from 'lucide-react'
import { useBacklinks } from '@/api/documents'
import './Backlinks.scss'

// "Linked from": the documents that link to this one. Hidden when none do.
export default function Backlinks({ documentId }: { documentId: number }) {
  const { data: documents = [] } = useBacklinks(documentId)
  if (documents.length === 0) return null

  return (
    <section className="ui-backlinks" aria-label="Linked from">
      <h2 className="ui-backlinks-title"><Link2 className="ui-backlinks-icon" aria-hidden="true" /> Linked from {documents.length} {documents.length === 1 ? 'document' : 'documents'}</h2>
      <ul className="ui-backlinks-list">
        {documents.map((doc) => (
          <li key={doc.id}><Link to={`/documents/${doc.id}`} className="ui-backlinks-link">{doc.title}</Link></li>
        ))}
      </ul>
    </section>
  )
}
