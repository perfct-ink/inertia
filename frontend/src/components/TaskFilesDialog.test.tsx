import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import TaskFilesDialog from './TaskFilesDialog'

const mockAttach = { mutate: jest.fn(), mutateAsync: jest.fn().mockResolvedValue({}) }
const mockDetach = { mutate: jest.fn() }
const mockUpload = jest.fn().mockResolvedValue([{ id: 30 }])
jest.mock('react-router-dom', () => ({ Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a> }))
jest.mock('@/api/tasks', () => ({ useTaskFiles: () => ({ attach: mockAttach, detach: mockDetach }) }))
jest.mock('@/api/workspace', () => ({
  useUploadFiles: () => ({ mutateAsync: mockUpload, isPending: false }),
  useWorkspace: () => ({ data: { root_folder_id: 1, folders: [{ id: 1, name: 'Root', root: true, archived: false, children: [], documents: [
    { id: 10, title: 'mock.png', doc_type: 'file', file: { byte_size: 2048 } }, { id: 11, title: 'spec.pdf', doc_type: 'file', file: { byte_size: 1024 } }, { id: 12, title: 'Notes', doc_type: 'document' },
  ] }] } }),
}))

const task = { id: 4, title: 'Design', file_ids: [10] } as never

afterEach(() => jest.clearAllMocks())

test('lists attached files, detaches one, and attaches another from the Space', () => {
  render(<TaskFilesDialog task={task} onClose={jest.fn()} />)
  expect(screen.getByRole('link', { name: 'mock.png' })).toHaveAttribute('href', '/documents/10')
  fireEvent.click(screen.getByRole('button', { name: 'Detach mock.png' }))
  expect(mockDetach.mutate).toHaveBeenCalledWith({ taskId: 4, fileId: 10 }, expect.anything())

  const options = Array.from((screen.getByLabelText('Attach an existing file') as HTMLSelectElement).options).map((o) => o.textContent)
  expect(options).toEqual(['Attach a file from this Space…', 'spec.pdf'])
  fireEvent.change(screen.getByLabelText('Attach an existing file'), { target: { value: '11' } })
  expect(mockAttach.mutate).toHaveBeenCalledWith({ taskId: 4, fileId: 11 }, expect.anything())
})

test('uploads new files into the Root and attaches them', async () => {
  render(<TaskFilesDialog task={task} onClose={jest.fn()} />)
  const picked = [new File(['x'], 'new.png', { type: 'image/png' })]
  fireEvent.change(screen.getByLabelText('Choose files to attach'), { target: { files: picked } })
  await waitFor(() => expect(mockUpload).toHaveBeenCalledWith({ folderId: 1, files: picked }))
  await waitFor(() => expect(mockAttach.mutateAsync).toHaveBeenCalledWith({ taskId: 4, fileId: 30 }))
})

test('says when nothing is attached', () => {
  render(<TaskFilesDialog task={{ id: 5, title: 'Empty', file_ids: [] } as never} onClose={jest.fn()} />)
  expect(screen.getByText('No files attached.')).toBeInTheDocument()
})
