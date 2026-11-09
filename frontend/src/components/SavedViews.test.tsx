import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import SavedViews from './SavedViews'
import { DEFAULT_TASK_TABLE_CONFIG, parseTaskTableConfig, type TaskTableConfig } from '@/data/taskTable'
import { useAuthStore } from '@/store/auth'

const mockCreate = { mutate: jest.fn(), isPending: false }
const mockUpdate = { mutate: jest.fn(), isPending: false }
const mockDelete = { mutate: jest.fn() }
let mockRole = 'member'
const mockViews = [
  { id: 1, page: 'task_table', name: 'By epic', shared: false, user_id: 5, owner_name: 'Pat', config: { groupBy: 'epic', sortKey: 'title' } },
  { id: 2, page: 'task_table', name: 'Team view', shared: true, user_id: 9, owner_name: 'Sam', config: { sortKey: 'status', hidden: ['sprint'] } },
  { id: 3, page: 'task_table', name: 'Mine for all', shared: true, user_id: 5, owner_name: 'Pat', config: { query: 'bug' } },
  { id: 4, page: 'task_table', name: 'Sam private', shared: false, user_id: 9, owner_name: 'Sam', config: {} },
]
jest.mock('@/api/savedViews', () => ({
  useSavedViews: () => ({ data: mockViews.filter((v) => v.user_id === 5 || v.shared) }),
  useCreateSavedView: () => mockCreate,
  useUpdateSavedView: () => mockUpdate,
  useDeleteSavedView: () => mockDelete,
}))
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: { role: mockRole } }) }))

beforeEach(() => {
  mockRole = 'member'
  useAuthStore.setState({ token: 't', user: { id: 5, name: 'Pat', email: 'p@x.co' } })
})
afterEach(() => jest.clearAllMocks())

const current: TaskTableConfig = { ...DEFAULT_TASK_TABLE_CONFIG, sortKey: 'title', query: 'ship' }
const show = (config = current, onApply = jest.fn()) =>
  render(<SavedViews page="task_table" config={config} parse={parseTaskTableConfig} onApply={onApply} />)
const pick = (id: string) => fireEvent.change(screen.getByLabelText('Saved view'), { target: { value: id } })

test('lists your views and other people\'s shared ones, and never someone else\'s private view', () => {
  show()
  expect(screen.getByRole('option', { name: 'By epic' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'Mine for all (shared)' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'Team view (Sam)' })).toBeInTheDocument()
  expect(screen.queryByRole('option', { name: /Sam private/ })).not.toBeInTheDocument()
})

test('picking a view applies its config, filling in defaults; Default view starts over', () => {
  const onApply = jest.fn()
  show(current, onApply)
  pick('2')
  expect(onApply).toHaveBeenLastCalledWith({ ...DEFAULT_TASK_TABLE_CONFIG, sortKey: 'status', hidden: ['sprint'] })
  pick('')
  expect(onApply).toHaveBeenLastCalledWith(DEFAULT_TASK_TABLE_CONFIG)
})

test('does not say Changed while the page matches the picked view', () => {
  show({ ...DEFAULT_TASK_TABLE_CONFIG, groupBy: 'epic', sortKey: 'title' })
  pick('1')
  expect(screen.queryByText('Changed')).not.toBeInTheDocument()
})

test('a changed view says so and can be updated with the current choices', () => {
  show()
  pick('1')
  expect(screen.getByText('Changed')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Manage view By epic' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Update with current settings' }))
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 1, config: current })
})

test('saves the current choices under a name, optionally shared, and selects the new view', () => {
  show()
  fireEvent.click(screen.getByRole('button', { name: 'Save view…' }))
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('View name'), { target: { value: ' Weekly ' } })
  fireEvent.click(screen.getByRole('checkbox', { name: 'Share with the Space' }))
  expect(screen.getByText(/Everyone in the Space can use it/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(mockCreate.mutate).toHaveBeenCalledWith({ name: 'Weekly', shared: true, config: current }, expect.anything())
})

test('renames and shares a view you own', () => {
  show()
  pick('1')
  fireEvent.click(screen.getByRole('button', { name: 'Manage view By epic' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Rename or share…' }))
  expect(screen.getByLabelText('View name')).toHaveValue('By epic')
  fireEvent.change(screen.getByLabelText('View name'), { target: { value: 'Epics' } })
  fireEvent.click(screen.getByRole('checkbox', { name: 'Share with the Space' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 1, name: 'Epics', shared: true }, expect.anything())
})

test('deleting asks first', () => {
  show()
  pick('3')
  fireEvent.click(screen.getByRole('button', { name: 'Manage view Mine for all' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Delete view…' }))
  expect(screen.getByText('It is shared, so it disappears for everyone in the Space.')).toBeInTheDocument()
  expect(mockDelete.mutate).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Delete view' }))
  expect(mockDelete.mutate).toHaveBeenCalledWith(3, expect.anything())
})

test('only a Space admin can manage a view someone else shared', () => {
  const asMember = show()
  pick('2')
  expect(screen.queryByRole('button', { name: /Manage view/ })).not.toBeInTheDocument()
  asMember.unmount()

  mockRole = 'admin'
  show()
  pick('2')
  expect(screen.getByRole('button', { name: 'Manage view Team view' })).toBeInTheDocument()
})

// Alex decided 2026-11-09 that viewers may save views and change their own.
test('a viewer can save a shared view, apply views and manage their own, but not someone else\'s shared view', () => {
  mockRole = 'viewer'
  const onApply = jest.fn()
  show(current, onApply)
  pick('1')
  expect(onApply).toHaveBeenCalledWith({ ...DEFAULT_TASK_TABLE_CONFIG, groupBy: 'epic', sortKey: 'title' })
  expect(screen.getByRole('button', { name: 'Manage view By epic' })).toBeInTheDocument()
  pick('2')
  expect(screen.queryByRole('button', { name: /Manage view/ })).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Save view…' }))
  fireEvent.change(screen.getByLabelText('View name'), { target: { value: 'Viewer shared' } })
  fireEvent.click(screen.getByRole('checkbox', { name: 'Share with the Space' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(mockCreate.mutate).toHaveBeenCalledWith({ name: 'Viewer shared', shared: true, config: current }, expect.anything())
})
