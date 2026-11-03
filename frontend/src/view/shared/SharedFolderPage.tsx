import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FileText, Loader2 } from 'lucide-react'
import { classNames } from '@/components/ui'
import ReadOnlyDocument from '@/components/editors/ReadOnlyDocument'
import { folderOutline, sharedDocumentPath, unavailableText, type OutlineNode, type SharedDocument, type SharedFolder } from '@/data/share'

interface OpenDocument {
  data?: { resource: { document: SharedDocument } }
  isLoading: boolean
  isError: boolean
  error: unknown
}

const statusOf = (error: unknown) => (error as { response?: { status?: number } } | null)?.response?.status

// The documents of a shared folder, level by level; the one being read is marked.
function Outline({ node, token, openId }: { node: OutlineNode; token: string; openId: number | null }) {
  return (
    <>
      {node.documents.length > 0 && (
        <ul className="shared-nav_list">
          {node.documents.map((doc) => (
            <li key={doc.id}>
              <Link
                to={sharedDocumentPath(token, doc.id)}
                aria-current={doc.id === openId ? 'page' : undefined}
                className={classNames('shared-nav_item', doc.id === openId && 'shared-nav_item--current')}
              >
                <FileText className="shared-nav_icon" aria-hidden="true" />
                <span className="shared-nav_text">{doc.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {node.children.map((child) => (
        <section key={child.folder.id} className="shared-nav_group" aria-label={child.folder.name}>
          <h2 className="shared-nav_folder">{child.folder.icon ? `${child.folder.icon} ` : ''}{child.folder.name}</h2>
          <Outline node={child} token={token} openId={openId} />
        </section>
      ))}
    </>
  )
}

// A folder link: the readable documents on one side, the one chosen on the
// other (a phone shows one at a time). View only; there is nothing to edit.
export default function SharedFolderPage({ token, shared, openId, doc }: { token: string; shared: SharedFolder; openId: number | null; doc: OpenDocument }) {
  const outline = useMemo(() => folderOutline(shared), [shared])
  const empty = outline.documents.length === 0 && outline.children.length === 0
  const reading = openId !== null

  return (
    <div className={classNames('shared-folder', reading && 'shared-folder--reading')}>
      <nav className="shared-nav" aria-label={`Documents in ${shared.folder.name}`}>
        <h1 className="shared-nav_title">{shared.folder.icon ? `${shared.folder.icon} ` : ''}{shared.folder.name}</h1>
        {empty ? <p className="shared-message">There is nothing to read in this folder yet.</p> : <Outline node={outline} token={token} openId={openId} />}
        {shared.truncated && <p className="shared-message">Only the first documents are listed.</p>}
      </nav>
      <section className="shared-pane" aria-label="Document">
        {!reading && <p className="shared-message">Choose a document to read.</p>}
        {reading && (
          <>
            <Link to={`/shared/${token}`} className="shared-back">
              <ArrowLeft className="shared-nav_icon" aria-hidden="true" /> All documents
            </Link>
            {doc.isLoading && <Loader2 className="shared-spinner" role="status" aria-label="Loading" />}
            {doc.isError && (
              <p role="alert" className="shared-message">
                {statusOf(doc.error) === 404 ? 'This document isn’t part of this shared folder.' : unavailableText(statusOf(doc.error))}
              </p>
            )}
            {doc.data && <ReadOnlyDocument content={doc.data.resource.document.content} />}
          </>
        )}
      </section>
    </div>
  )
}
