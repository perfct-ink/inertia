import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import DocumentScreen from '@/view/document/DocumentScreen'
import FolderDetailScreen from '@/view/folder_detail/FolderDetailScreen'
import { usePathLookup } from '@/api/paths'
import { useWorkspace } from '@/api/workspace'
import { pathIndexFor, redirectFor, resolvePath, splitPath, type ItemRef, type ItemType } from '@/data/path'
import { usePageTitle } from '@/hooks/usePageTitle'
import { errorMessage } from '@/util/errorMessage'
import './ItemRoute.scss'

const NOT_FOUND = 'Nothing is at this address in this Space. It may have been deleted, or it may be in another Space.'

function Loading() {
  usePageTitle(undefined)
  return (
    <WorkspaceLayout>
      <div className="view-item"><Loader2 className="item-spinner" aria-label="Loading" /></div>
    </WorkspaceLayout>
  )
}

function Unavailable({ error }: { error: unknown }) {
  const navigate = useNavigate()
  const missing = isAxiosError(error) && error.response?.status === 404
  usePageTitle(missing ? 'Page not found' : 'Page unavailable')
  return (
    <WorkspaceLayout>
      <div className="view-item">
        <h1 className="item-title">{missing ? 'Page not found' : 'This page could not be opened'}</h1>
        <p role="alert" className="item-message">{missing ? NOT_FOUND : errorMessage(error)}</p>
        <Button variant="primary" onClick={() => navigate('/space')}>Go to the Space home</Button>
      </div>
    </WorkspaceLayout>
  )
}

// Opens the folder or document an address names. Two kinds of address reach it:
//   - the hierarchical path (/acme/product/requirements), found in the Space's
//     folder tree, or on the server when the tree has not caught up or the item
//     was renamed or moved (the server also knows its old addresses);
//   - the id path (/documents/12, /folders/3, `type` set by the route), which
//     always works and is what older links and headings use.
// Once the item is known its address is rewritten (replace, so Back is not
// trapped) to the current hierarchical path, keeping ?query and #hash. Both
// kinds render through this one component so that rewriting, or a rename while
// the item is open, never remounts the editor.
export default function ItemRoute({ type }: { type?: ItemType }) {
  const { id: idParam } = useParams()
  const { pathname, search, hash } = useLocation()
  const navigate = useNavigate()
  const { data: workspace, isError: workspaceFailed, error: workspaceError } = useWorkspace()
  const folders = workspace?.folders
  const [remembered, setRemembered] = useState<{ pathname: string; item: ItemRef } | null>(null)

  const id = Number(idParam)
  const byId: ItemRef | null = type && Number.isInteger(id) ? { type, id } : null
  const live = !byId && folders ? resolvePath(folders, splitPath(pathname)) : null
  // An open item whose address just changed under it (renamed in the editor):
  // keep showing it while the address catches up.
  const sticky = remembered?.pathname === pathname ? remembered.item : null
  const known = byId ?? live ?? sticky
  const lookup = usePathLookup(pathname, !known && !!folders)
  const item: ItemRef | null = known ?? (lookup.data ? { type: lookup.data.type, id: lookup.data.id } : null)

  // The server's current path for an old address; otherwise what the tree says.
  const better = !known && lookup.data?.moved ? lookup.data.path : item && folders ? redirectFor(pathIndexFor(folders), item, pathname) : null

  // Remember what this address showed (set while rendering, the pattern for state derived from props).
  if (item && (remembered?.pathname !== pathname || remembered.item.type !== item.type || remembered.item.id !== item.id)) {
    setRemembered({ pathname, item })
  }

  useEffect(() => {
    if (better && better !== pathname) navigate({ pathname: better, search, hash }, { replace: true })
  }, [better, pathname, search, hash, navigate])

  if (item) return item.type === 'document' ? <DocumentScreen key={item.id} id={item.id} /> : <FolderDetailScreen id={item.id} />
  if (workspaceFailed) return <Unavailable error={workspaceError} />
  if (lookup.isError) return <Unavailable error={lookup.error} />
  return <Loading />
}
