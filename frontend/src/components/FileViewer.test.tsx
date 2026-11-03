import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import FileViewer from './FileViewer'
import { useTransferStore } from '@/store/transfer'

let mockCanTransfer = true
jest.mock('@/hooks/useTransferTargets', () => ({ useTransferTargets: () => ({ targets: [], canTransfer: mockCanTransfer, isLoading: false }) }))

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
const mockMove = { mutate: jest.fn() }
const mockReplace = { mutate: jest.fn(), isPending: false }
const mockUpdate = { mutate: jest.fn() }
jest.mock('@/api/workspace', () => ({
  useWorkspace: () => ({ data: { folders: [{ id: 1, name: 'Root', root: true, archived: false, children: [{ id: 2, name: 'Assets', archived: false, children: [], documents: [] }], documents: [] }] } }),
  useReplaceFile: () => mockReplace,
}))
jest.mock('@/api/documents', () => ({ useUpdateDocument: () => mockUpdate, useMoveDocument: () => mockMove }))
jest.mock('@/lib/api', () => ({ __esModule: true, default: { defaults: { baseURL: 'http://api.test' } } }))
jest.mock('@/store/tabs', () => ({ useTabsStore: () => ({ updateTitle: jest.fn() }) }))

const file = (extra = {}) => ({ id: 5, title: 'photo.png', doc_type: 'file', folder_id: 1, file: { url: '/rails/blob/photo.png', filename: 'photo.png', content_type: 'image/png', byte_size: 3482 }, ...extra }) as never

afterEach(() => jest.clearAllMocks())
beforeEach(() => {
  mockCanTransfer = true
  useTransferStore.setState({ request: null })
})

test('shows the name, type and size, a download link and an image preview', () => {
  render(<FileViewer doc={file()} />)
  expect(screen.getByLabelText('File name')).toHaveValue('photo.png')
  expect(screen.getByText('image/png · 3.4 KB')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Download/ })).toHaveAttribute('href', 'http://api.test/rails/blob/photo.png')
  expect(screen.getByRole('img', { name: 'photo.png' })).toBeInTheDocument()
})

test('a file with no preview says to download it', () => {
  render(<FileViewer doc={file({ file: { url: '/x', filename: 'a.zip', content_type: 'application/zip', byte_size: 10 } })} />)
  expect(screen.getByText(/No preview for this type/)).toBeInTheDocument()
})

test('renames on leaving the field, moves to another folder, and replaces with a new version', () => {
  render(<FileViewer doc={file()} />)
  const name = screen.getByLabelText('File name')
  fireEvent.change(name, { target: { value: 'cover.png' } })
  fireEvent.blur(name)
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 5, title: 'cover.png' }, expect.anything())

  fireEvent.change(screen.getByLabelText('Folder'), { target: { value: '2' } })
  expect(mockMove.mutate).toHaveBeenCalledWith({ id: 5, folderId: 2 }, expect.anything())

  const next = new File(['x'], 'v2.png', { type: 'image/png' })
  fireEvent.change(screen.getByLabelText('Choose the new version'), { target: { files: [next] } })
  expect(mockReplace.mutate).toHaveBeenCalledWith({ documentId: 5, file: next }, expect.anything())
})

test('the file can be moved or copied to another Space, unless there is none to write in', () => {
  const { unmount } = render(<FileViewer doc={file()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Move or copy to another Space' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Move to Space…' }))
  expect(useTransferStore.getState().request).toEqual({ mode: 'move', kind: 'document', id: 5, name: 'photo.png', documentIds: [5] })
  unmount()

  mockCanTransfer = false
  render(<FileViewer doc={file()} />)
  expect(screen.queryByRole('button', { name: 'Move or copy to another Space' })).not.toBeInTheDocument()
})
