import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import SavedViews from './SavedViews'
import { useAuthStore } from '@/store/auth'

const mockCreate = { mutate: jest.fn(), isPending: false }
const mockDelete = { mutate: jest.fn() }
jest.mock('@/api/savedViews', () => ({
  useSavedViews: () => ({
    data: [
      { id: 1, page: 'task_table', name: 'By epic', shared: false, user_id: 5, owner_name: 'Pat', config: { groupBy: 'epic' } },
      { id: 2, page: 'task_table', name: 'Team view', shared: true, user_id: 9, owner_name: 'Sam', config: { sortKey: 'title' } },
    ],
  }),
  useCreateSavedView: () => mockCreate,
  useDeleteSavedView: () => mockDelete,
}))

beforeEach(() => useAuthStore.setState({ token: 't', user: { id: 5, name: 'Pat', email: 'p@x.co' } }))
afterEach(() => jest.clearAllMocks())

test('picking a view applies its config; shared views name their owner', () => {
  const onApply = jest.fn()
  render(<SavedViews page="task_table" config={{}} onApply={onApply} />)
  expect(screen.getByRole('option', { name: 'Team view (shared, Sam)' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Saved views', { selector: 'select' }), { target: { value: '1' } })
  expect(onApply).toHaveBeenCalledWith({ groupBy: 'epic' })
})

test('saves the current choices under a name, optionally shared', () => {
  render(<SavedViews page="task_table" config={{ sortKey: 'due_date' }} onApply={jest.fn()} />)
  expect(screen.getByRole('button', { name: 'Save view' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('New view name'), { target: { value: ' Weekly ' } })
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'Save view' }))
  expect(mockCreate.mutate).toHaveBeenCalledWith({ name: 'Weekly', shared: true, config: { sortKey: 'due_date' } }, expect.anything())
})

test('only your own view can be deleted', () => {
  render(<SavedViews page="task_table" config={{}} onApply={jest.fn()} />)
  fireEvent.change(screen.getByLabelText('Saved views', { selector: 'select' }), { target: { value: '2' } })
  expect(screen.queryByRole('button', { name: /Delete view/ })).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Saved views', { selector: 'select' }), { target: { value: '1' } })
  fireEvent.click(screen.getByRole('button', { name: 'Delete view By epic' }))
  expect(mockDelete.mutate).toHaveBeenCalledWith(1)
})
