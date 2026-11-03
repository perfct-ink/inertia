import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import SharedScreen from './SharedScreen'
import { useAuthStore } from '@/store/auth'
import type { SharedFolder } from '@/data/share'

type Query = { data?: unknown; isLoading: boolean; isError: boolean; error?: unknown; refetch?: jest.Mock }
let mockLink: Query
let mockOpen: Query
const mockSharedDocument = jest.fn()
jest.mock('@/api/shares', () => ({
  useSharedLink: () => mockLink,
  useSharedDocument: (...args: unknown[]) => { mockSharedDocument(...args); return mockOpen },
}))
jest.mock('@/components/RoadmapTimeline', () => function TimelineMock() { return <div>timeline</div> })
jest.mock('@/components/editors/ReadOnlyDocument', () => function ReadOnlyMock({ content }: { content: unknown }) {
  return <div data-testid="read-only-document">{JSON.stringify(content)}</div>
})

const page = (kind: string, resource: unknown, expires_at: string | null = null) => ({ kind, access: 'view', expires_at, resource })
const folderResource: SharedFolder = {
  folder: { id: 1, name: 'Plans', icon: null },
  folders: [{ id: 2, name: 'Q1', icon: null, parent_id: 1 }],
  documents: [
    { id: 10, title: 'Launch plan', folder_id: 1, updated_at: '2026-11-01T00:00:00Z' },
    { id: 11, title: 'Q1 goals', folder_id: 2, updated_at: '2026-11-01T00:00:00Z' },
  ],
  truncated: false,
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/shared/:token" element={<SharedScreen />} />
        <Route path="/shared/:token/documents/:documentId" element={<SharedScreen />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockLink = { isLoading: false, isError: false }
  mockOpen = { isLoading: false, isError: false }
  useAuthStore.setState({ token: null, user: null })
})
afterEach(() => jest.clearAllMocks())

test('shows the roadmap read-only for a valid link', () => {
  mockLink.data = page('roadmap', { roadmap: { name: 'Acme', milestones: [], initiatives: [], epics: [] } })
  renderAt('/shared/abc')
  expect(screen.getByRole('heading', { name: 'Acme roadmap' })).toBeInTheDocument()
  expect(screen.getByText('timeline')).toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

test('says plainly that the page is shared and view only', () => {
  mockLink.data = page('document', { document: { title: 'Launch plan', doc_type: 'document', content: { type: 'doc' }, updated_at: '' } })
  renderAt('/shared/abc')
  expect(screen.getByRole('note')).toHaveTextContent('Shared with you, view only.')
})

test('shows a shared document\'s text, with nothing to edit', () => {
  mockLink.data = page('document', { document: { title: 'Launch plan', doc_type: 'document', content: { type: 'doc', content: [] }, updated_at: '' } })
  renderAt('/shared/abc')
  expect(screen.getByTestId('read-only-document')).toHaveTextContent('"type":"doc"')
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(document.title).toBe('Launch plan · Inertia')
})

test('says when the link expires', () => {
  mockLink.data = page('document', { document: { title: 'Plan', doc_type: 'document', content: null, updated_at: '' } }, '2099-01-02T12:00:00Z')
  renderAt('/shared/abc')
  expect(screen.getByRole('note')).toHaveTextContent('Expires Jan 2, 2099')
})

test('offers the sign-in page to someone signed out, and their Space to someone signed in', () => {
  mockLink.data = page('document', { document: { title: 'Plan', doc_type: 'document', content: null, updated_at: '' } })
  const { unmount } = renderAt('/shared/abc')
  expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  unmount()

  useAuthStore.setState({ token: 'jwt', user: { id: 1, name: 'Pat', email: 'pat@example.com' } })
  renderAt('/shared/abc')
  expect(screen.getByRole('link', { name: 'Go to your Space' })).toHaveAttribute('href', '/space')
})

test('a folder link lists its documents and subfolders, and asks for one to be chosen', () => {
  mockLink.data = page('folder', folderResource)
  renderAt('/shared/abc')
  const nav = screen.getByRole('navigation', { name: 'Documents in Plans' })
  expect(within(nav).getByRole('link', { name: 'Launch plan' })).toHaveAttribute('href', '/shared/abc/documents/10')
  const group = within(nav).getByRole('region', { name: 'Q1' })
  expect(within(group).getByRole('link', { name: 'Q1 goals' })).toHaveAttribute('href', '/shared/abc/documents/11')
  expect(screen.getByText('Choose a document to read.')).toBeInTheDocument()
  expect(mockSharedDocument).toHaveBeenLastCalledWith('abc', null)
})

test('opening a document in a folder link reads it, marks it in the list and links back', () => {
  mockLink.data = page('folder', folderResource)
  mockOpen.data = page('document', { document: { id: 11, title: 'Q1 goals', doc_type: 'document', content: { type: 'doc', content: [] }, updated_at: '' } })
  renderAt('/shared/abc/documents/11')
  expect(mockSharedDocument).toHaveBeenLastCalledWith('abc', 11)
  expect(screen.getByTestId('read-only-document')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Q1 goals' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: /All documents/ })).toHaveAttribute('href', '/shared/abc')
  expect(document.title).toBe('Q1 goals · Inertia')
})

test('a document outside the shared folder says so', () => {
  mockLink.data = page('folder', folderResource)
  mockOpen = { isLoading: false, isError: true, error: { response: { status: 404 } } }
  renderAt('/shared/abc/documents/99')
  expect(screen.getByRole('alert')).toHaveTextContent('isn’t part of this shared folder')
})

test('an empty folder says there is nothing to read', () => {
  mockLink.data = page('folder', { ...folderResource, folders: [], documents: [] })
  renderAt('/shared/abc')
  expect(screen.getByText('There is nothing to read in this folder yet.')).toBeInTheDocument()
})

test('an unavailable link is explained, without a banner or a retry', () => {
  mockLink = { isLoading: false, isError: true, error: { response: { status: 404 } } }
  renderAt('/shared/abc')
  expect(screen.getByRole('alert')).toHaveTextContent('isn’t available')
  expect(screen.queryByRole('note')).not.toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

test('a busy or failed load offers to try again', () => {
  const refetch = jest.fn()
  mockLink = { isLoading: false, isError: true, error: { response: { status: 429 } }, refetch }
  renderAt('/shared/abc')
  expect(screen.getByRole('alert')).toHaveTextContent('Too many requests')
  screen.getByRole('button', { name: 'Try again' }).click()
  expect(refetch).toHaveBeenCalled()
})
