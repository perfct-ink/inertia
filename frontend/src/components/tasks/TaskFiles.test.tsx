import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { TaskFiles } from './TaskFiles'
import type { Task } from '@/types'

const mockAttach = { mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false }
const mockDetach = { mutate: jest.fn(), isPending: false }
const mockUpload = { mutateAsync: jest.fn(), isPending: false }
jest.mock('@/api/tasks', () => ({ useAttachTaskFile: () => mockAttach, useDetachTaskFile: () => mockDetach }))

const pdf = { id: 11, title: 'spec.pdf', doc_type: 'file', folder_id: 2, file: { url: '/rails/blob/spec.pdf', filename: 'spec.pdf', content_type: 'application/pdf', byte_size: 2048 } }
const zip = { id: 12, title: 'assets.zip', doc_type: 'file', folder_id: 2, file: { url: '/rails/blob/assets.zip', filename: 'assets.zip', content_type: 'application/zip', byte_size: 10 } }
const plain = { id: 13, title: 'Notes', doc_type: 'document', folder_id: 2 }
let mockRole = 'member'
jest.mock('@/api/workspace', () => ({
  useWorkspace: () => ({
    data: { role: mockRole, root_folder_id: 1, folders: [{ id: 1, name: 'Root', root: true, documents: [], children: [{ id: 2, name: 'Assets', documents: [pdf, zip, plain], children: [] }] }] },
  }),
  useUploadFiles: () => mockUpload,
}))
jest.mock('@/lib/api', () => ({ __esModule: true, default: { defaults: { baseURL: 'http://api.test' } } }))

const task = (extra = {}) => ({ id: 7, title: 'Design', folder_id: null, file_ids: [], document: { folder_id: 2 }, ...extra }) as unknown as Task

beforeEach(() => { mockRole = 'member' })
afterEach(() => jest.clearAllMocks())

test('says so when nothing is attached and offers the Space\'s uploaded files, not other documents', () => {
  render(<TaskFiles task={task()} onClose={jest.fn()} />)
  expect(screen.getByText('No files attached yet.')).toBeInTheDocument()
  const select = screen.getByLabelText('Attach a file from this Space')
  expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual(['Attach a file from this Space…', 'assets.zip', 'spec.pdf'])
})

test('attached files show as cards with a download link, and the picker leaves them out', () => {
  render(<TaskFiles task={task({ file_ids: [11] })} onClose={jest.fn()} />)
  expect(screen.getByRole('group', { name: 'Attachment: spec.pdf' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Download spec.pdf' })).toHaveAttribute('href', 'http://api.test/rails/blob/spec.pdf?disposition=attachment')
  const options = within(screen.getByLabelText('Attach a file from this Space')).getAllByRole('option').map((o) => o.textContent)
  expect(options).toEqual(['Attach a file from this Space…', 'assets.zip'])
})

test('choosing a file attaches it to the task', () => {
  render(<TaskFiles task={task()} onClose={jest.fn()} />)
  fireEvent.change(screen.getByLabelText('Attach a file from this Space'), { target: { value: '12' } })
  expect(mockAttach.mutate).toHaveBeenCalledWith({ taskId: 7, fileId: 12 }, expect.anything())
})

test('Detach removes the link and a failed call shows the error', () => {
  mockDetach.mutate.mockImplementation((_vars, { onError }) => onError(new Error('x')))
  render(<TaskFiles task={task({ file_ids: [11] })} onClose={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Detach spec.pdf' }))
  expect(mockDetach.mutate).toHaveBeenCalledWith({ taskId: 7, fileId: 11 }, expect.anything())
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to save')
})

test('uploading puts the files in the task\'s folder and attaches each one', async () => {
  mockUpload.mutateAsync.mockResolvedValue([{ id: 21 }, { id: 22 }])
  mockAttach.mutateAsync.mockResolvedValue({})
  render(<TaskFiles task={task()} onClose={jest.fn()} />)
  const a = new File(['a'], 'a.txt', { type: 'text/plain' })
  const b = new File(['b'], 'b.txt', { type: 'text/plain' })
  fireEvent.change(screen.getByLabelText('Choose files to upload and attach'), { target: { files: [a, b] } })
  await waitFor(() => expect(mockAttach.mutateAsync).toHaveBeenCalledTimes(2))
  expect(mockUpload.mutateAsync).toHaveBeenCalledWith({ folderId: 2, files: [a, b] })
  expect(mockAttach.mutateAsync).toHaveBeenNthCalledWith(1, { taskId: 7, fileId: 21 })
  expect(mockAttach.mutateAsync).toHaveBeenNthCalledWith(2, { taskId: 7, fileId: 22 })
})

test('a failed upload shows the error and attaches nothing', async () => {
  mockUpload.mutateAsync.mockRejectedValue(new Error('x'))
  render(<TaskFiles task={task()} onClose={jest.fn()} />)
  fireEvent.change(screen.getByLabelText('Choose files to upload and attach'), { target: { files: [new File(['a'], 'a.txt')] } })
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save')
  expect(mockAttach.mutateAsync).not.toHaveBeenCalled()
})

test('a task with no folder uploads into the Space\'s Root', async () => {
  mockUpload.mutateAsync.mockResolvedValue([])
  render(<TaskFiles task={task({ document: undefined })} onClose={jest.fn()} />)
  const file = new File(['a'], 'a.txt')
  fireEvent.change(screen.getByLabelText('Choose files to upload and attach'), { target: { files: [file] } })
  await waitFor(() => expect(mockUpload.mutateAsync).toHaveBeenCalledWith({ folderId: 1, files: [file] }))
})

test('viewers can open and download but not attach, upload or detach', () => {
  mockRole = 'viewer'
  render(<TaskFiles task={task({ file_ids: [11] })} onClose={jest.fn()} />)
  expect(screen.getByRole('link', { name: 'Download spec.pdf' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Detach spec.pdf' })).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Attach a file from this Space')).not.toBeInTheDocument()
  expect(screen.queryByText('Upload and attach')).not.toBeInTheDocument()
})
