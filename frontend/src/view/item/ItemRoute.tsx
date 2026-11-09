import { useEffect, useRef, useState } from 'react'
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
import { useOpenInWorkspace } from '@/hooks/useSwitchWorkspace'
import { usePageTitle } from '@/hooks/usePageTitle'
import { errorMessage } from '@/util/errorMessage'
import './ItemRoute.scss'

// The same words for an address that names nothing and one the person cannot
// open (the server answers both with the same 404), so the screen never says
// whether a Space they are not in holds something.
const NOT_FOUND = 'Nothing you can open is at this address. It may have been deleted, or you may not have access to it.'

function Loading({ label }: { label?: string }) {
  usePageTitle(undefined)
  return (
    <WorkspaceLayout>
      <div className="view-item">
        <Loader2 className="item-spinner" aria-label="Loading" />
        {label && <p role="status" className="item-message">{label}</p>}
      </div>
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
// The address does not name a Space. The open Space is tried first; if it does
// not hold the address the server looks in the person's other Spaces (never
// beyond them), and when it finds the item in one of those this switches to
// that Space and opens the item there. An address nobody can open is "Page not
// found", the same screen whether the item does not exist or sits in a Space
// the person is not in.
// Once the item is known its address is rewritten (replace, so Back is not
// trapped) to the current hierarchical path, keeping ?query, #hash and state. Both
// kinds render through this one component so that rewriting, or a rename while
// the item is open, never remounts the editor.
export default function ItemRoute({ type }: { type?: ItemType }) {
  const { id: idParam } = useParams()
  const { pathname, search, hash, state } = useLocation()
  const navigate = useNavigate()
  const openInWorkspace = useOpenInWorkspace()
  const { data: workspace, isError: workspaceFailed, error: workspaceError } = useWorkspace()
  const folders = workspace?.folders
  const [remembered, setRemembered] = useState<{ pathname: string; item: ItemRef } | null>(null)
  // The Space and path this address already sent the person to, so a Space that
  // will not become the open one cannot loop.
  const switchedTo = useRef<string | null>(null)

  const id = Number(idParam)
  const byId: ItemRef | null = type && Number.isInteger(id) ? { type, id } : null
  const live = !byId && folders ? resolvePath(folders, splitPath(pathname)) : null
  // An open item whose address just changed under it (renamed in the editor):
  // keep showing it while the address catches up.
  const sticky = remembered?.pathname === pathname ? remembered.item : null
  const known = byId ?? live ?? sticky
  const lookup = usePathLookup(pathname, !known && !!folders)
  // Found, but in another of the person's Spaces than the open one.
  const elsewhere = !known && workspace && lookup.data && lookup.data.workspace.id !== workspace.id ? lookup.data : null
  const item: ItemRef | null = known ?? (lookup.data && !elsewhere ? { type: lookup.data.type, id: lookup.data.id } : null)

  // The server's current path for an old address; otherwise what the tree says.
  const better = elsewhere ? null : !known && lookup.data?.moved ? lookup.data.path : item && folders ? redirectFor(pathIndexFor(folders), item, pathname) : null

  // Remember what this address showed (set while rendering, the pattern for state derived from props).
  if (item && (remembered?.pathname !== pathname || remembered.item.type !== item.type || remembered.item.id !== item.id)) {
    setRemembered({ pathname, item })
  }

  useEffect(() => {
    // state is kept: a new document's { focusTitle } must survive the rewrite.
    if (better && better !== pathname) navigate({ pathname: better, search, hash }, { replace: true, state })
  }, [better, pathname, search, hash, state, navigate])

  useEffect(() => {
    if (item) switchedTo.current = null // arrived: a later visit may switch again
    if (!elsewhere) return
    const attempt = `${elsewhere.workspace.id}:${elsewhere.path}`
    if (switchedTo.current === attempt) return
    switchedTo.current = attempt
    // The item's current path in its own Space (an old address lands on the new one).
    openInWorkspace(elsewhere.workspace, { pathname: elsewhere.path, search, hash }, { replace: true, state })
  }, [item, elsewhere, search, hash, state, openInWorkspace])

  if (item) return item.type === 'document' ? <DocumentScreen key={item.id} id={item.id} /> : <FolderDetailScreen id={item.id} />
  if (workspaceFailed) return <Unavailable error={workspaceError} />
  if (lookup.isError) return <Unavailable error={lookup.error} />
  if (elsewhere) return <Loading label={`Opening in ${elsewhere.workspace.name}`} />
  return <Loading />
}
