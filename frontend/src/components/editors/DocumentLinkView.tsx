import { Link } from 'react-router-dom'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { FileText } from 'lucide-react'
import { useWorkspace } from '@/api/workspace'
import { findDocument } from '@/data/folder'
import './DocumentLinkView.scss'

// Shows the linked document's current title (so a rename updates the link),
// or a muted "Deleted document" when it no longer exists.
export default function DocumentLinkView({ node }: NodeViewProps) {
  const { data: workspace } = useWorkspace()
  const documentId = node.attrs.documentId as number | null
  const target = documentId == null ? undefined : findDocument(workspace?.folders ?? [], documentId)

  return (
    <NodeViewWrapper as="span" className="document_link" contentEditable={false}>
      {target
        ? <Link to={`/documents/${target.id}`} className="document_link-anchor"><FileText className="document_link-icon" aria-hidden="true" />{target.title}</Link>
        : <span className="document_link-missing">{workspace ? 'Deleted document' : 'Loading…'}</span>}
    </NodeViewWrapper>
  )
}
