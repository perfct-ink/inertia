import { Link, useParams } from 'react-router-dom'
import { Eye, Loader2 } from 'lucide-react'
import { Button, classNames } from '@/components/ui'
import RoadmapTimeline from '@/components/RoadmapTimeline'
import ReadOnlyDocument from '@/components/editors/ReadOnlyDocument'
import { useSharedDocument, useSharedLink } from '@/api/shares'
import { useAuthStore } from '@/store/auth'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useHeadMeta } from '@/hooks/useHeadMeta'
import { expiryText, unavailableText } from '@/data/share'
import SharedFolderPage from './SharedFolderPage'
import '../roadmap/RoadmapScreen.scss'
import './SharedScreen.scss'

// Says what this page is, on every shared page: it is a link someone made, and
// it can be read but not changed. Signed-in people are offered their Space,
// everyone else the sign-in page.
function SharedBanner({ expiresAt }: { expiresAt: string | null }) {
  const signedIn = useAuthStore((s) => s.token !== null)
  return (
    <div className="shared-banner" role="note">
      <Eye className="shared-banner_icon" aria-hidden="true" />
      <p className="shared-banner_text">Shared with you, view only.</p>
      {expiresAt && <p className="shared-banner_meta">{expiryText(expiresAt)}</p>}
      <Link to={signedIn ? '/space' : '/login'} className="shared-banner_link">{signedIn ? 'Go to your Space' : 'Sign in'}</Link>
    </div>
  )
}

const statusOf = (error: unknown) => (error as { response?: { status?: number } } | null)?.response?.status

// The page for /shared/:token (and /shared/:token/documents/:documentId inside a
// folder link): a document, a folder's documents, or a Space's roadmap, read
// only, for anyone who has the link, signed in or not. Nothing here edits, and
// nothing outside the shared item is requested (docs/features/shared_links.md).
export default function SharedScreen() {
  const { token = '', documentId } = useParams<{ token: string; documentId: string }>()
  const link = useSharedLink(token)
  const page = link.data
  const openId = documentId && Number.isInteger(Number(documentId)) ? Number(documentId) : null
  const openDocument = useSharedDocument(token, page?.kind === 'folder' ? openId : null)

  const title =
    page?.kind === 'document' ? page.resource.document.title
    : page?.kind === 'roadmap' ? `${page.resource.roadmap.name} roadmap`
    : page?.kind === 'folder' ? (openDocument.data?.resource.document.title ?? page.resource.folder.name)
    : undefined
  usePageTitle(title ?? 'Shared')
  // The address holds the link's secret: keep search engines out, and keep the
  // address from being sent on as a referrer to the sites the page links to.
  useHeadMeta({ robots: 'noindex, nofollow', referrer: 'no-referrer' })

  return (
    <div className={classNames('view-shared', page?.kind === 'roadmap' && 'view-roadmap')}>
      {page && <SharedBanner expiresAt={page.expires_at} />}
      <main className="shared-body">
        {link.isLoading && <Loader2 className="shared-spinner" role="status" aria-label="Loading" />}
        {link.isError && (
          <div role="alert" className="shared-problem">
            <p className="shared-message">{unavailableText(statusOf(link.error))}</p>
            {statusOf(link.error) !== 404 && <Button variant="secondary" onClick={() => link.refetch()}>Try again</Button>}
          </div>
        )}
        {page?.kind === 'document' && (
          <article className="shared-document">
            <ReadOnlyDocument content={page.resource.document.content} />
          </article>
        )}
        {page?.kind === 'folder' && <SharedFolderPage token={token} shared={page.resource} openId={openId} doc={openDocument} />}
        {page?.kind === 'roadmap' && (
          <>
            <h1 className="shared-title">{page.resource.roadmap.name} roadmap</h1>
            <RoadmapTimeline milestones={page.resource.roadmap.milestones} initiatives={page.resource.roadmap.initiatives} epics={page.resource.roadmap.epics} />
          </>
        )}
      </main>
    </div>
  )
}
