import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import ReleasesScreen from './ReleasesScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
const mockCreate = { mutate: jest.fn(), isPending: false }
const mockUpdate = { mutate: jest.fn() }
const mockAdd = { mutate: jest.fn() }
const mockRemove = { mutate: jest.fn() }
const mockPlan = { mutate: jest.fn(), isPending: false }
jest.mock('@/api/releases', () => ({
  useReleases: () => ({
    data: [{ id: 1, title: 'Debut EP', kind: 'ep', release_date: '2026-12-01', document_ids: [10], tasks_count: 4, done_tasks_count: 1 }],
    isLoading: false,
  }),
  useCreateRelease: () => mockCreate,
  useUpdateRelease: () => mockUpdate,
  useDeleteRelease: () => ({ mutate: jest.fn() }),
  useAddReleaseDocument: () => mockAdd,
  useRemoveReleaseDocument: () => mockRemove,
  usePlanRelease: () => mockPlan,
  useReleaseTasks: () => ({ data: [{ id: 5, title: 'Mix', status: 'in_progress', document: { title: 'Song A' } }] }),
}))
jest.mock('@/api/workspace', () => ({
  useWorkspace: () => ({
    data: { folders: [{ id: 1, documents: [{ id: 10, title: 'Song A', doc_type: 'document' }, { id: 11, title: 'Song B', doc_type: 'document' }], children: [] }] },
  }),
}))

afterEach(() => jest.clearAllMocks())

test('adds a release by title', () => {
  render(<ReleasesScreen />)
  fireEvent.change(screen.getByLabelText('New release'), { target: { value: 'Album' } })
  fireEvent.click(screen.getByRole('button', { name: /Add release/ }))
  expect(mockCreate.mutate).toHaveBeenCalledWith({ title: 'Album' }, expect.anything())
})

test('shows progress, changes kind and date, and adds or removes songs', () => {
  render(<ReleasesScreen />)
  expect(screen.getByText('1/4 tasks done')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Kind'), { target: { value: 'album' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 1, kind: 'album' })
  fireEvent.change(screen.getByLabelText('Release date'), { target: { value: '2027-01-01' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 1, release_date: '2027-01-01' })

  fireEvent.change(screen.getByLabelText('Add a song to Debut EP'), { target: { value: '11' } })
  expect(mockAdd.mutate).toHaveBeenCalledWith({ id: 1, documentId: 11 })
  fireEvent.click(screen.getByRole('button', { name: 'Remove Song A from Debut EP' }))
  expect(mockRemove.mutate).toHaveBeenCalledWith({ id: 1, documentId: 10 })
})

test('lists every task from the release songs', () => {
  render(<ReleasesScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Show tasks' }))
  expect(screen.getByText(/Mix/)).toBeInTheDocument()
  expect(screen.getByText(/in progress · Song A/)).toBeInTheDocument()
})

test('creating the release plan reports how many tasks were added', () => {
  mockPlan.mutate.mockImplementation((_id, { onSuccess }) => onSuccess({ created: 12 }))
  render(<ReleasesScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Create release plan' }))
  expect(mockPlan.mutate).toHaveBeenCalledWith(1, expect.anything())
  expect(screen.getByRole('status')).toHaveTextContent('Added 12 tasks, dated back from the release date.')
})
