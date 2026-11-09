import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import ItemRoute from './ItemRoute'

// errorMessage() and ItemRoute tell axios errors apart with isAxiosError.
jest.mock('axios', () => {
  const actual = jest.requireActual('axios')
  return { ...actual, __esModule: true, isAxiosError: (e: { isAxiosError?: boolean } | null) => !!e && e.isAxiosError === true }
})

const mockLookup = jest.fn()
const mockWorkspace = jest.fn()
const mockOpenIn = jest.fn()
jest.mock('@/api/workspace', () => ({ useWorkspace: () => mockWorkspace() }))
jest.mock('@/hooks/useSwitchWorkspace', () => ({ useOpenInWorkspace: () => mockOpenIn }))
jest.mock('@/api/paths', () => ({ usePathLookup: (pathname: string, enabled: boolean) => mockLookup(pathname, enabled) }))
jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
jest.mock('@/view/document/DocumentScreen', () => function DocumentMock({ id }: { id: number }) { return <p>Document {id}</p> })
jest.mock('@/view/folder_detail/FolderDetailScreen', () => function FolderMock({ id }: { id: number }) { return <p>Folder {id}</p> })

const doc = (id: number, slug: string, folder_id: number) => ({ id, title: slug, slug, doc_type: 'document', folder_id })
const tree = [{
  id: 1, name: 'Root', slug: null, root: true, documents: [doc(9, 'loose', 1)],
  children: [{ id: 2, name: 'Product', slug: 'product', documents: [doc(10, 'requirements', 2)], children: [] }],
}]

function Where() {
  const { pathname, search, hash, state } = useLocation()
  return <p data-testid="where">{pathname + search + hash + JSON.stringify(state)}</p>
}

type Entry = string | { pathname: string; search?: string; hash?: string; state?: unknown }

function app(path: Entry) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/documents/:id" element={<><ItemRoute type="document" /><Where /></>} />
        <Route path="/folders/:id" element={<><ItemRoute type="folder" /><Where /></>} />
        <Route path="*" element={<><ItemRoute /><Where /></>} />
      </Routes>
    </MemoryRouter>
  )
}

const renderAt = (path: Entry) => render(app(path))

const studio = { id: 5, name: 'Studio', personal: false, role: 'viewer' }
const inSpace = (workspace: object, rest: object = {}) => ({
  data: { type: 'document', id: 77, path: '/handbook/onboarding', moved: false, workspace, ...rest }, isError: false, error: null,
})

beforeEach(() => {
  mockOpenIn.mockReset()
  mockWorkspace.mockReturnValue({ data: { id: 1, folders: tree }, isError: false, error: null })
  mockLookup.mockReturnValue({ data: undefined, isError: false, error: null })
})

test('a hierarchical path opens the document or folder it names, from the Space tree', () => {
  renderAt('/product/requirements')
  expect(screen.getByText('Document 10')).toBeInTheDocument()
  expect(screen.getByTestId('where')).toHaveTextContent('/product/requirements')
  expect(mockLookup).toHaveBeenLastCalledWith('/product/requirements', false)
})

test('a folder path opens the folder page', () => {
  renderAt('/product')
  expect(screen.getByText('Folder 2')).toBeInTheDocument()
})

test('an old id link opens at once and its address becomes the hierarchical path, keeping ?query and #hash', async () => {
  renderAt('/documents/10?view=x#launch-plan')
  expect(screen.getByText('Document 10')).toBeInTheDocument()
  await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/product/requirements?view=x#launch-plan'))
})

test('the address rewrite keeps the location state (a new document focuses its title)', async () => {
  renderAt({ pathname: '/documents/9', state: { focusTitle: true } })
  await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/loose{"focusTitle":true}'))
})

test('an id path stays as it is while the item is not in the tree yet', () => {
  renderAt('/folders/77')
  expect(screen.getByText('Folder 77')).toBeInTheDocument()
  expect(screen.getByTestId('where')).toHaveTextContent('/folders/77')
})

test('an address the tree does not know is looked up on the server, and an old address redirects to the current one', async () => {
  mockLookup.mockImplementation((_path: string, enabled: boolean) => ({
    data: enabled ? { type: 'document', id: 10, path: '/product/requirements', moved: true, workspace: { id: 1, name: 'Mine', personal: true, role: 'owner' } } : undefined, isError: false, error: null,
  }))
  renderAt('/old/place')
  expect(screen.getByText('Document 10')).toBeInTheDocument()
  await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/product/requirements'))
})

test('an address that names nothing says so, with a way back to the Space', () => {
  mockLookup.mockReturnValue({ data: undefined, isError: true, error: { isAxiosError: true, response: { status: 404 }, message: 'x' } })
  renderAt('/nothing/here')
  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('Nothing you can open is at this address')
  expect(screen.getByRole('button', { name: 'Go to the Space home' })).toBeInTheDocument()
})

test('an address found in another of the person\'s Spaces switches to that Space and opens it there', async () => {
  mockLookup.mockReturnValue(inSpace(studio))
  renderAt({ pathname: '/handbook/onboarding', search: '?view=x', hash: '#intro', state: { from: 'link' } })
  // Nothing from the other Space is shown in this one while switching.
  expect(screen.queryByText('Document 77')).not.toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('Opening in Studio')
  await waitFor(() => expect(mockOpenIn).toHaveBeenCalledTimes(1))
  expect(mockOpenIn).toHaveBeenCalledWith(studio, { pathname: '/handbook/onboarding', search: '?view=x', hash: '#intro' }, { replace: true, state: { from: 'link' } })
})

test('an old address goes to the item\'s current path in its own Space', async () => {
  mockLookup.mockReturnValue(inSpace(studio, { path: '/guide/onboarding', moved: true }))
  renderAt('/handbook/onboarding')
  await waitFor(() => expect(mockOpenIn).toHaveBeenCalledTimes(1))
  expect(mockOpenIn).toHaveBeenCalledWith(studio, { pathname: '/guide/onboarding', search: '', hash: '' }, expect.objectContaining({ replace: true }))
  // The open Space's own address is not rewritten in the meantime.
  expect(screen.getByTestId('where')).toHaveTextContent('/handbook/onboarding')
})

test('it switches only once for an address, even if the Space has not become the open one', async () => {
  mockLookup.mockImplementation(() => inSpace(studio))
  const { rerender } = renderAt('/handbook/onboarding')
  await waitFor(() => expect(mockOpenIn).toHaveBeenCalledTimes(1))
  rerender(app('/handbook/onboarding'))
  expect(mockOpenIn).toHaveBeenCalledTimes(1)
})

test('an address found in the open Space opens without switching', async () => {
  mockLookup.mockReturnValue(inSpace({ id: 1, name: 'Mine', personal: true, role: 'owner' }))
  renderAt('/handbook/onboarding')
  expect(screen.getByText('Document 77')).toBeInTheDocument()
  expect(mockOpenIn).not.toHaveBeenCalled()
})

test('an address in a Space the person is not in looks exactly like one that names nothing', () => {
  // The server answers both with the same 404.
  mockLookup.mockReturnValue({ data: undefined, isError: true, error: { isAxiosError: true, response: { status: 404, data: { error: 'Not found' } }, message: 'x' } })
  renderAt('/private/plan')
  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('Nothing you can open is at this address. It may have been deleted, or you may not have access to it.')
  expect(mockOpenIn).not.toHaveBeenCalled()
})

test('a failed lookup shows the error rather than a blank page', () => {
  mockLookup.mockReturnValue({ data: undefined, isError: true, error: { isAxiosError: true, message: 'Network Error' } })
  renderAt('/nothing/here')
  expect(screen.getByRole('heading', { name: 'This page could not be opened' })).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to reach the server')
})

test('a Space that failed to load shows its error', () => {
  mockWorkspace.mockReturnValue({ data: undefined, isError: true, error: { isAxiosError: true, response: { status: 500, data: { error: 'Space unavailable' } }, message: 'x' } })
  renderAt('/product')
  expect(screen.getByRole('alert')).toHaveTextContent('Space unavailable')
})
