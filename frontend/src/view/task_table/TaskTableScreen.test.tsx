import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import TaskTableScreen from './TaskTableScreen'
import { useAuthStore } from '@/store/auth'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
const mockUpdate = { mutate: jest.fn() }
jest.mock('@/api/tasks', () => ({
  useTasks: () => ({
    data: [
      { id: 1, title: 'Write spec', status: 'todo', start_date: null, due_date: '2026-11-09', assignee_id: null, epic_id: null, sprint_id: null },
      { id: 2, title: 'Ship', status: 'done', start_date: null, due_date: '2026-11-01', assignee_id: 7, epic_id: 1, sprint_id: null },
    ],
    isLoading: false,
  }),
  useUpdateTask: () => mockUpdate,
}))
jest.mock('@/api/epics', () => ({ useEpics: () => ({ data: [{ id: 1, title: 'Onboarding' }] }) }))
jest.mock('@/api/sprints', () => ({ useSprints: () => ({ data: [] }) }))
jest.mock('@/api/workspaceMembers', () => ({ useWorkspaceMembers: () => ({ data: [{ user_id: 7, user: { name: 'Sam' } }] }) }))
const mockCreateView = { mutate: jest.fn(), isPending: false }
jest.mock('@/api/savedViews', () => ({
  useSavedViews: () => ({
    data: [{
      id: 1, page: 'task_table', name: 'Shipping', shared: false, user_id: 5, owner_name: 'Pat',
      config: { sortKey: 'title', sortDir: 'desc', groupBy: 'status', query: 'sh', hidden: ['epic', 'title'] },
    }],
  }),
  useCreateSavedView: () => mockCreateView,
  useUpdateSavedView: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteSavedView: () => ({ mutate: jest.fn() }),
}))
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: { role: 'member' } }) }))

beforeEach(() => useAuthStore.setState({ token: 't', user: { id: 5, name: 'Pat', email: 'p@x.co' } }))
afterEach(() => jest.clearAllMocks())

const titles = () => screen.getAllByRole('textbox').map((i) => (i as HTMLInputElement).defaultValue).filter(Boolean)

test('edits status, date, assignee and title in place', () => {
  render(<TaskTableScreen />)
  fireEvent.change(screen.getByLabelText('Status of Write spec'), { target: { value: 'in_progress' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 1, status: 'in_progress' })
  fireEvent.change(screen.getByLabelText('Due date of Write spec'), { target: { value: '2026-12-01' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 1, due_date: '2026-12-01' })
  fireEvent.change(screen.getByLabelText('Assignee of Write spec'), { target: { value: '7' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 1, assignee_id: 7 })
  const title = screen.getByLabelText('Title of Write spec')
  fireEvent.change(title, { target: { value: 'Write the spec' } })
  fireEvent.blur(title)
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 1, title: 'Write the spec' })
})

test('a blank title is not saved', () => {
  render(<TaskTableScreen />)
  const title = screen.getByLabelText('Title of Ship')
  fireEvent.change(title, { target: { value: '  ' } })
  fireEvent.blur(title)
  expect(mockUpdate.mutate).not.toHaveBeenCalled()
})

test('sorts by a clicked column, filters, groups and hides columns', () => {
  render(<TaskTableScreen />)
  expect(titles()).toEqual(['Ship', 'Write spec'])   // default sort: due date ascending
  fireEvent.click(screen.getByRole('button', { name: 'Due' }))
  expect(titles()).toEqual(['Write spec', 'Ship'])

  fireEvent.change(screen.getByLabelText('Filter tasks'), { target: { value: 'ship' } })
  expect(titles()).toEqual(['Ship'])
  fireEvent.change(screen.getByLabelText('Filter tasks'), { target: { value: '' } })

  fireEvent.change(screen.getByLabelText('Group by'), { target: { value: 'status' } })
  expect(screen.getByRole('heading', { name: /To Do/ })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /Done/ })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('checkbox', { name: 'Epic' }))
  expect(screen.queryByLabelText('Epic of Ship')).not.toBeInTheDocument()
})

test('a saved view puts its sort, grouping, filter and hidden columns on the table', () => {
  render(<TaskTableScreen />)
  fireEvent.change(screen.getByLabelText('Saved view'), { target: { value: '1' } })
  expect(screen.getByLabelText('Filter tasks')).toHaveValue('sh')
  expect(screen.getByLabelText('Group by')).toHaveValue('status')
  expect(screen.getByRole('columnheader', { name: 'Due' })).toHaveAttribute('aria-sort', 'none')
  expect(screen.getByRole('columnheader', { name: 'Title' })).toHaveAttribute('aria-sort', 'descending')
  expect(screen.getByRole('checkbox', { name: 'Epic' })).not.toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Title' })).toBeChecked()
  expect(screen.queryByLabelText('Title of Write spec')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Title of Ship')).toBeInTheDocument()
})

test('saves the table\'s current choices as a view', () => {
  render(<TaskTableScreen />)
  fireEvent.change(screen.getByLabelText('Filter tasks'), { target: { value: 'ship' } })
  fireEvent.click(screen.getByRole('button', { name: 'Due' }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Sprint' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save view…' }))
  fireEvent.change(screen.getByLabelText('View name'), { target: { value: 'Shipping soon' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(mockCreateView.mutate).toHaveBeenCalledWith(
    { name: 'Shipping soon', shared: false, config: { sortKey: 'due_date', sortDir: 'desc', groupBy: 'none', query: 'ship', hidden: ['sprint'] } },
    expect.anything(),
  )
})
