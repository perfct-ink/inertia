import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CreateItem from './CreateItem'

const mockCreate = jest.fn().mockResolvedValue({ id: 9 })
const mockUpload = jest.fn().mockResolvedValue([])
const mockNavigate = jest.fn()
const mockWorkspace = {
  id: 1, name: 'Workspace', root_folder_id: 101,
  folders: [{ id: 101, name: 'Root', root: true, archived: false, documents: [], children: [
    { id: 202, name: 'Project', archived: false, documents: [], children: [] },
  ] }],
}

jest.mock('@/api/workspace', () => ({
  useWorkspace: () => ({ data: mockWorkspace }),
  useCreateDocument: () => ({ mutateAsync: mockCreate }),
  useUploadFiles: () => ({ mutateAsync: mockUpload }),
}))
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

afterEach(() => jest.clearAllMocks())

test('new items default to root and open the resulting document', async () => {
  render(<CreateItem />)
  fireEvent.click(screen.getByRole('button', { name: 'New Document' }))
  await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({ folderId: 101, title: 'Untitled Document', doc_type: 'document' }))
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/documents/9'))
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
