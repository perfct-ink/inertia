import { useHref } from 'react-router-dom'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { useWorkspace } from '@/api/workspace'
import DocTypeIcon from '@/components/DocTypeIcon'
import { findDocument } from '@/data/folder'
import { documentPath } from '@/data/heading'
import './DocumentLinkView.scss'

// The node view of an inline link to another document (extensions/DocumentLink.ts):
// the target's current title (so a rename updates every link to it), or a muted
// note when the document is gone. A click is followed by the editor screen
// (useFollowDocumentLinks), which opens it without reloading the app.
export default function DocumentLinkView({ node }: NodeViewProps) {
  const { data: workspace } = useWorkspace()
  const documentId = node.attrs.documentId as number | null
  const target = documentId == null ? undefined : findDocument(workspace?.folders ?? [], documentId)
  const href = useHref(documentPath({ documentId: documentId ?? 0, anchor: null }))

  return (
    <NodeViewWrapper as="span" className="document_link" contentEditable={false}>
      {target
        ? (
          <a href={href} className="document_link-anchor">
            <DocTypeIcon type={target.doc_type} className="document_link-icon" />
            {target.title || 'Untitled'}
          </a>
        )
        : <span className="document_link-missing">{workspace ? 'Document not found' : 'Loading…'}</span>}
    </NodeViewWrapper>
  )
}
