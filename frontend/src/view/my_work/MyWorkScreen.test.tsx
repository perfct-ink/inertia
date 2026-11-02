import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import MyWorkScreen from './MyWorkScreen'
import { useAuthStore } from '@/store/auth'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
}))
const mockUpdate = { mutate: jest.fn() }
let mockTasks: unknown[]
jest.mock('@/api/tasks', () => ({ useTasks: () => ({ data: mockTasks, isLoading: false }), useUpdateTask: () => mockUpdate }))

const task = (id: number, assignee_id: number, due_date: string | null, status = 'todo', extra = {}) =>
  ({ id, title: `Task ${id}`, assignee_id, due_date, status, ...extra })

beforeEach(() => useAuthStore.setState({ token: 't', user: { id: 5, name: 'Pat', email: 'p@x.co' } }))
afterEach(() => jest.clearAllMocks())

test('shows only my open tasks, grouped by when they are due', () => {
  mockTasks = [task(1, 5, '2000-01-01'), task(2, 5, null), task(3, 6, null), task(4, 5, null, 'done'), task(5, 5, '2999-01-01', 'todo', { document: { id: 9, title: 'Spec' } })]
  render(<MyWorkScreen />)
  expect(screen.getByRole('region', { name: 'Overdue' })).toHaveTextContent('Task 1')
  expect(screen.getByRole('region', { name: 'No date' })).toHaveTextContent('Task 2')
  expect(screen.getByRole('region', { name: 'Later' })).toHaveTextContent('Task 5')
  expect(screen.getByRole('link', { name: 'Spec' })).toHaveAttribute('href', '/documents/9')
  expect(screen.queryByText('Task 3')).not.toBeInTheDocument()
  expect(screen.queryByText('Task 4')).not.toBeInTheDocument()
})

test('changes a task status from the list', () => {
  mockTasks = [task(1, 5, null)]
  render(<MyWorkScreen />)
  fireEvent.change(screen.getByLabelText('Status of Task 1'), { target: { value: 'done' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 1, status: 'done' })
})

test('says when nothing is assigned', () => {
  mockTasks = []
  render(<MyWorkScreen />)
  expect(screen.getByText('Nothing is assigned to you right now.')).toBeInTheDocument()
})
