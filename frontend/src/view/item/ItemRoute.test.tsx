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
jest.mock('@/api/workspace', () => ({ useWorkspace: () => mockWorkspace() }))
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

function renderAt(path: string | { pathname: string; state: unknown }) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/documents/:id" element={<><ItemRoute type="document" /><Where /></>} />
        <Route path="/folders/:id" element={<><ItemRoute type="folder" /><Where /></>} />
        <Route path="*" element={<><ItemRoute /><Where /></>} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  mockWorkspace.mockReturnValue({ data: { folders: tree }, isError: false, error: null })
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
    data: enabled ? { type: 'document', id: 10, path: '/product/requirements', moved: true } : undefined, isError: false, error: null,
  }))
  renderAt('/old/place')
  expect(screen.getByText('Document 10')).toBeInTheDocument()
  await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/product/requirements'))
})

test('an address that names nothing says so, with a way back to the Space', () => {
  mockLookup.mockReturnValue({ data: undefined, isError: true, error: { isAxiosError: true, response: { status: 404 }, message: 'x' } })
  renderAt('/nothing/here')
  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('Nothing is at this address in this Space')
  expect(screen.getByRole('button', { name: 'Go to the Space home' })).toBeInTheDocument()
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
