import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { format } from 'date-fns'
import CalendarScreen from './CalendarScreen'
import { useAuthStore } from '@/store/auth'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
const today = format(new Date(), 'yyyy-MM-dd')
jest.mock('@/api/tasks', () => ({
  useTasks: () => ({
    data: [{ id: 1, title: 'Ship it', due_date: new Date().toLocaleDateString('en-CA'), status: 'todo' }, { id: 2, title: 'Finished', due_date: new Date().toLocaleDateString('en-CA'), status: 'done' }],
    isLoading: false,
  }),
}))
jest.mock('@/api/events', () => ({ useEvents: () => ({ data: [{ id: 5, title: 'Launch party', date: new Date().toLocaleDateString('en-CA') }] }) }))
const mockCreateView = { mutate: jest.fn(), isPending: false }
jest.mock('@/api/savedViews', () => ({
  useSavedViews: () => ({
    data: [{ id: 1, page: 'calendar', name: 'Events only', shared: false, user_id: 5, owner_name: 'Pat', config: { showTasks: false } }],
  }),
  useCreateSavedView: () => mockCreateView,
  useUpdateSavedView: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteSavedView: () => ({ mutate: jest.fn() }),
}))
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: { role: 'member' } }) }))

beforeEach(() => useAuthStore.setState({ token: 't', user: { id: 5, name: 'Pat', email: 'p@x.co' } }))
afterEach(() => jest.clearAllMocks())

test('shows tasks on their due date and events on their date, in the grid and the phone agenda', () => {
  render(<CalendarScreen />)
  expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(screen.getAllByText('Ship it')).toHaveLength(2)
  expect(screen.getAllByText('Launch party')).toHaveLength(2)
  expect(screen.getAllByText('Finished')[0].className).toContain('calendar-chip--done')
})

test('tasks and events can be hidden independently', () => {
  render(<CalendarScreen />)
  fireEvent.click(screen.getByRole('checkbox', { name: 'Tasks' }))
  expect(screen.queryByText('Ship it')).not.toBeInTheDocument()
  expect(screen.getAllByText('Launch party')).toHaveLength(2)
  fireEvent.click(screen.getByRole('checkbox', { name: 'Events' }))
  expect(screen.getByText('Nothing this month')).toBeInTheDocument()
})

test('month navigation moves to the next month', () => {
  render(<CalendarScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
  expect(screen.queryByText('Ship it')).not.toBeInTheDocument()
})

test('a saved view sets which kinds of item are shown', () => {
  render(<CalendarScreen />)
  fireEvent.change(screen.getByLabelText('Saved view'), { target: { value: '1' } })
  expect(screen.getByRole('checkbox', { name: 'Tasks' })).not.toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Events' })).toBeChecked()
  expect(screen.queryByText('Ship it')).not.toBeInTheDocument()
  expect(screen.getAllByText('Launch party')).toHaveLength(2)
})

test('saves what is shown as a view', () => {
  render(<CalendarScreen />)
  fireEvent.click(screen.getByRole('checkbox', { name: 'Events' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save view…' }))
  fireEvent.change(screen.getByLabelText('View name'), { target: { value: 'Just tasks' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(mockCreateView.mutate).toHaveBeenCalledWith({ name: 'Just tasks', shared: false, config: { showTasks: true, showEvents: false } }, expect.anything())
})
