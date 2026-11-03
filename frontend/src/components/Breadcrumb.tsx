import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useWorkspace } from '@/api/workspace'
import { folderTrail } from '@/data/folder'
import './Breadcrumb.scss'

// Space › folder › sub-folder › document, each folder a link; the document is
// the current page. Shown above a document's toolbar. `actions` sit at the
// right of the same row (the page's Move or copy menu).
export default function Breadcrumb({ folderId, title, actions }: { folderId: number; title: string; actions?: ReactNode }) {
  const { data: workspace } = useWorkspace()
  const trail = folderTrail(workspace?.folders ?? [], folderId)

  return (
    <div className="ui-breadcrumb">
      <nav className="ui-breadcrumb-nav" aria-label="Breadcrumb">
        <ol className="ui-breadcrumb-list">
          <li className="ui-breadcrumb-item">
            <Link to="/space" className="ui-breadcrumb-link">{workspace?.name ?? 'Space'}</Link>
          </li>
          {trail.map((folder) => (
            <li key={folder.id} className="ui-breadcrumb-item">
              <ChevronRight className="ui-breadcrumb-separator" aria-hidden="true" />
              <Link to={`/folders/${folder.id}`} className="ui-breadcrumb-link">{folder.name}</Link>
            </li>
          ))}
          <li className="ui-breadcrumb-item">
            <ChevronRight className="ui-breadcrumb-separator" aria-hidden="true" />
            <span className="ui-breadcrumb-current" aria-current="page">{title}</span>
          </li>
        </ol>
      </nav>
      {actions && <div className="ui-breadcrumb-actions">{actions}</div>}
    </div>
  )
}
