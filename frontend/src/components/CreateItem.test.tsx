import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CreateItem from './CreateItem'

const mockCreate = jest.fn().mockResolvedValue({ id: 9 })
const mockUpload = jest.fn().mockResolvedValue([])
const mockNavigate = jest.fn()
const mockWorkspace: { storage?: { used: number; limit: number } } & Record<string, unknown> = {
  id: 1, name: 'Workspace', root_folder_id: 101,
  folders: [{ id: 101, name: 'Root', root: true, archived: false, documents: [], children: [
    { id: 202, name: 'Project', archived: false, documents: [], children: [] },
  ] }],
}

jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: mockWorkspace }), useUploadFiles: () => ({ mutateAsync: mockUpload }) }))
jest.mock('@/api/documents', () => ({ useCreateDocument: () => ({ mutateAsync: mockCreate }) }))
jest.mock('@/api/folders', () => ({ useCreateFolder: () => ({ mutateAsync: jest.fn() }) }))
jest.mock('@/hooks/useSelectProject', () => ({ useSelectProject: () => jest.fn() }))
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

afterEach(() => jest.clearAllMocks())

test('new items default to root and open the resulting document', async () => {
  render(<CreateItem />)
  fireEvent.click(screen.getByRole('button', { name: 'New Document' }))
  await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({ folderId: 101, title: 'Untitled Document', doc_type: 'document' }))
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/documents/9', { state: { focusTitle: true } }))
  expect(screen.getAllByRole('option', { name: 'Root' })).toHaveLength(1)
})

test('the destination selector can create a sheet in a folder beneath root', async () => {
  render(<CreateItem />)
  fireEvent.change(screen.getByRole('combobox', { name: 'Create in folder' }), { target: { value: '202' } })
  fireEvent.click(screen.getByRole('button', { name: 'New Sheet' }))
  await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({ folderId: 202, title: 'Untitled Sheet', doc_type: 'spreadsheet' }))
})

test('chosen files are uploaded into the folder, several at once', async () => {
  render(<CreateItem folderId={202} />)
  const files = [new File(['a'], 'a.pdf', { type: 'application/pdf' }), new File(['b'], 'b.png', { type: 'image/png' })]
  fireEvent.change(screen.getByLabelText('Choose files to upload'), { target: { files } })
  await waitFor(() => expect(mockUpload).toHaveBeenCalledWith({ folderId: 202, files }))
})

test('a template button creates a document with the template content', async () => {
  render(<CreateItem />)
  fireEvent.click(screen.getByRole('button', { name: 'New Song' }))
  await waitFor(() => expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ folderId: 101, title: 'Untitled Song', doc_type: 'document', content: expect.objectContaining({ type: 'doc' }) })))
})

test('shows how much of the Space\'s storage is used', () => {
  mockWorkspace.storage = { used: 5 * 1024 * 1024, limit: 1024 ** 3 }
  render(<CreateItem />)
  expect(screen.getByText('5 MB of 1 GB used')).toBeInTheDocument()
  delete (mockWorkspace as { storage?: unknown }).storage
})
