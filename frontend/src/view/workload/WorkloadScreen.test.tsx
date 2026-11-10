import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { addDays, format } from 'date-fns'
import WorkloadScreen from './WorkloadScreen'
import { useAuthStore } from '@/store/auth'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
const day = (n: number) => format(addDays(new Date(), n), 'yyyy-MM-dd')
jest.mock('@/api/tasks', () => {
  const { addDays, format } = jest.requireActual('date-fns')
  return {
  useTasks: () => ({
    data: [
      { id: 1, status: 'todo', assignee_id: 7, estimate_hours: 50, start_date: format(new Date(), 'yyyy-MM-dd'), due_date: format(addDays(new Date(), 13), 'yyyy-MM-dd') },
      { id: 2, status: 'todo', assignee_id: 7, estimate_hours: null, start_date: null, due_date: format(addDays(new Date(), 2), 'yyyy-MM-dd') },
    ],
    isLoading: false,
  }),
  }
})
jest.mock('@/api/workspaceMembers', () => ({ useWorkspaceMembers: () => ({ data: [{ user_id: 7, user: { name: 'Sam' } }] }) }))

const mockCreateView = { mutate: jest.fn(), isPending: false }
jest.mock('@/api/savedViews', () => ({
  useSavedViews: () => ({ data: [{ id: 1, page: 'workload', name: 'Shared', shared: true, user_id: 9, owner_name: 'Sam', config: { capacity: 20 } }] }),
  useCreateSavedView: () => mockCreateView,
  useUpdateSavedView: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteSavedView: () => ({ mutate: jest.fn() }),
}))
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: { role: 'member' } }) }))

beforeEach(() => useAuthStore.setState({ token: 't', user: { id: 5, name: 'Pat', email: 'p@x.co' } }))
afterEach(() => jest.clearAllMocks())

test('shows each person with hours per week and counts tasks it could not place', () => {
  render(<WorkloadScreen />)
  expect(day(0)).toBeTruthy()
  expect(screen.getByRole('rowheader', { name: 'Sam' })).toBeInTheDocument()
  expect(screen.getByText('50 h')).toBeInTheDocument()
  expect(screen.getByText(/1 open task is not counted/)).toBeInTheDocument()
})

test('a lower capacity flags weeks as over-allocated, in text', () => {
  render(<WorkloadScreen />)
  fireEvent.change(screen.getByLabelText('Weekly capacity in hours'), { target: { value: '10' } })
  expect(screen.getAllByText(/over by/).length).toBeGreaterThan(0)
})

test('a view someone shared sets the weekly capacity', () => {
  render(<WorkloadScreen />)
  expect(screen.getByLabelText('Weekly capacity in hours')).toHaveValue(40)
  fireEvent.change(screen.getByLabelText('Saved view'), { target: { value: '1' } })
  expect(screen.getByLabelText('Weekly capacity in hours')).toHaveValue(20)
})

test('saves the current capacity as a view', () => {
  render(<WorkloadScreen />)
  fireEvent.change(screen.getByLabelText('Weekly capacity in hours'), { target: { value: '30' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save view…' }))
  fireEvent.change(screen.getByLabelText('View name'), { target: { value: 'Part time' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(mockCreateView.mutate).toHaveBeenCalledWith({ name: 'Part time', shared: false, config: { capacity: 30 } }, expect.anything())
})
