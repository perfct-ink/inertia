import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import DocumentInitiativeBar from './DocumentInitiativeBar'

const mockUpdateDoc = { mutate: jest.fn() }
const mockUpdateInit = { mutate: jest.fn() }
const mockCreateInit = { mutate: jest.fn(), isPending: false }
jest.mock('@/api/documents', () => ({ useUpdateDocument: () => mockUpdateDoc }))
jest.mock('@/api/initiatives', () => ({
  useInitiatives: () => ({ data: [{ id: 3, title: 'Launch', start_date: '2026-11-01', target_date: '2026-12-01', tasks_count: 4, done_tasks_count: 1 }] }),
  useCreateInitiative: () => mockCreateInit,
  useUpdateInitiative: () => mockUpdateInit,
}))

const doc = (initiative_id: number | null) => ({ id: 9, title: 'Plan', doc_type: 'document', folder_id: 1, initiative_id, pinned: false, created_at: '', updated_at: '', content_updated_at: null }) as never

afterEach(() => jest.clearAllMocks())

test('picks an initiative for the document', () => {
  render(<DocumentInitiativeBar doc={doc(null)} />)
  fireEvent.change(screen.getByLabelText('Initiative', { selector: 'select' }), { target: { value: '3' } })
  expect(mockUpdateDoc.mutate).toHaveBeenCalledWith({ id: 9, initiative_id: 3 }, expect.anything())
})

test('shows and edits the initiative dates and progress', () => {
  render(<DocumentInitiativeBar doc={doc(3)} />)
  expect(screen.getByText('1/4 tasks done')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Initiative end'), { target: { value: '2026-12-15' } })
  expect(mockUpdateInit.mutate).toHaveBeenCalledWith({ id: 3, target_date: '2026-12-15' }, expect.anything())
})

test('creates a new initiative and attaches it', () => {
  render(<DocumentInitiativeBar doc={doc(null)} />)
  fireEvent.change(screen.getByLabelText('New initiative'), { target: { value: 'Beta' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create' }))
  expect(mockCreateInit.mutate).toHaveBeenCalledWith({ title: 'Beta' }, expect.anything())
})
