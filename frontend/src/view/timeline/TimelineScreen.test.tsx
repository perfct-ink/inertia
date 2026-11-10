import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import TimelineScreen from './TimelineScreen'
import { useAuthStore } from '@/store/auth'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
jest.mock('@/components/Timeline', () => ({
  Timeline: ({ items }: { items: { title: string }[] }) => <ul data-testid="timeline">{items.map((i) => <li key={i.title}>{i.title}</li>)}</ul>,
}))
let mockTasks: unknown[]
jest.mock('@/api/tasks', () => ({ useTasks: () => ({ data: mockTasks, isLoading: false }) }))
jest.mock('@/api/epics', () => ({
  useEpics: () => ({ data: [{ id: 1, title: 'Onboarding', start_date: '2026-11-01', target_date: '2026-11-30', tasks_count: 1, done_tasks_count: 0 }] }),
}))

const mockCreateView = { mutate: jest.fn(), isPending: false }
jest.mock('@/api/savedViews', () => ({
  useSavedViews: () => ({ data: [{ id: 1, page: 'timeline', name: 'Shared', shared: true, user_id: 9, owner_name: 'Sam', config: { grouping: 'epic' } }] }),
  useCreateSavedView: () => mockCreateView,
  useUpdateSavedView: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteSavedView: () => ({ mutate: jest.fn() }),
}))
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: { role: 'member' } }) }))

beforeEach(() => useAuthStore.setState({ token: 't', user: { id: 5, name: 'Pat', email: 'p@x.co' } }))
afterEach(() => jest.clearAllMocks())

const task = (id: number, title: string, due_date: string | null, epic_id: number | null = null) =>
  ({ id, title, status: 'todo', epic_id, start_date: null, due_date })

test('plots dated tasks and says how many have no date', () => {
  mockTasks = [task(1, 'Ship', '2026-11-10'), task(2, 'Someday', null)]
  render(<TimelineScreen />)
  expect(screen.getByTestId('timeline')).toHaveTextContent('Ship')
  expect(screen.getByTestId('timeline')).not.toHaveTextContent('Someday')
  expect(screen.getByText(/1 task has no due date/)).toBeInTheDocument()
})

test('grouping by epic adds the epic rows', () => {
  mockTasks = [task(1, 'Ship', '2026-11-10', 1)]
  render(<TimelineScreen />)
  fireEvent.change(screen.getByLabelText('Group by'), { target: { value: 'epic' } })
  expect(screen.getByTestId('timeline')).toHaveTextContent('Onboarding')
  expect(screen.getByTestId('timeline')).toHaveTextContent('Ship')
})

test('with no dated tasks it explains how to get something on the timeline', () => {
  mockTasks = [task(1, 'Someday', null)]
  render(<TimelineScreen />)
  expect(screen.getByText(/No tasks with dates yet/)).toBeInTheDocument()
})

test('a view someone shared sets the grouping', () => {
  mockTasks = [task(1, 'Ship', '2026-11-10', 1)]
  render(<TimelineScreen />)
  expect(screen.getByLabelText('Group by')).toHaveValue('none')
  fireEvent.change(screen.getByLabelText('Saved view'), { target: { value: '1' } })
  expect(screen.getByLabelText('Group by')).toHaveValue('epic')
  expect(screen.getByTestId('timeline')).toHaveTextContent('Onboarding')
})

test('saves the current grouping as a view', () => {
  mockTasks = []
  render(<TimelineScreen />)
  fireEvent.change(screen.getByLabelText('Group by'), { target: { value: 'epic' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save view…' }))
  fireEvent.change(screen.getByLabelText('View name'), { target: { value: 'By epic' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(mockCreateView.mutate).toHaveBeenCalledWith({ name: 'By epic', shared: false, config: { grouping: 'epic' } }, expect.anything())
})
