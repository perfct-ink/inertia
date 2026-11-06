import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import WorkloadScreen from './WorkloadScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
}))
jest.mock('@/store/workspaces', () => ({
  useWorkspaceStore: (select: (s: { activeWorkspaceId: number }) => unknown) => select({ activeWorkspaceId: 3 }),
}))

// Wednesday 4 November 2026: the first week shown starts on Monday 2 November.
const mockTasks = [
  { id: 1, status: 'todo', assignee_id: 7, estimate_hours: 50, start_date: '2026-11-02', due_date: '2026-11-06' },
  { id: 2, status: 'todo', assignee_id: 7, estimate_hours: null, start_date: null, due_date: '2026-11-04' },
  { id: 3, status: 'todo', assignee_id: 8, estimate_hours: 25, start_date: '2026-11-02', due_date: '2026-11-06' },
]
jest.mock('@/api/tasks', () => ({ useTasks: () => ({ data: mockTasks, isLoading: false }) }))

const mockMembers = [
  { id: 107, user_id: 7, role: 'member', weekly_capacity_hours: 40, user: { id: 7, name: 'Sam', email: 'sam@example.com' } },
  { id: 108, user_id: 8, role: 'member', weekly_capacity_hours: 20, user: { id: 8, name: 'Kim', email: 'kim@example.com' } },
]
jest.mock('@/api/workspaceMembers', () => ({ useWorkspaceMembers: () => ({ data: mockMembers }) }))

beforeAll(() => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date(2026, 10, 4, 12))
})
afterAll(() => jest.useRealTimers())
beforeEach(() => {
  mockMembers[0].weekly_capacity_hours = 40
  mockMembers[1].weekly_capacity_hours = 20
})

const rowOf = (name: string) => within(screen.getByRole('rowheader', { name: new RegExp(`^${name}`) }).closest('tr') as HTMLElement)

test('shows each person with their capacity and hours per week, and counts tasks it could not place', () => {
  render(<WorkloadScreen />)
  expect(screen.getByRole('rowheader', { name: /^Sam 40 h\/week$/ })).toBeInTheDocument()
  expect(rowOf('Sam').getByText('50 h')).toBeInTheDocument()
  expect(screen.getByText(/1 open task is not counted/)).toBeInTheDocument()
  expect(screen.queryByLabelText('Weekly capacity in hours')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Resources page' })).toHaveAttribute('href', '/resources')
})

test('flags a week against each person\'s own capacity, in text', () => {
  render(<WorkloadScreen />)
  expect(rowOf('Sam').getByText(/over by 10 h/)).toBeInTheDocument()
  expect(rowOf('Kim').getByText(/over by 5 h/)).toBeInTheDocument()
})

test('a capacity changed on the Resources page changes the warning', () => {
  mockMembers[0].weekly_capacity_hours = 60
  mockMembers[1].weekly_capacity_hours = 30
  render(<WorkloadScreen />)
  expect(screen.getByRole('rowheader', { name: /^Sam 60 h\/week$/ })).toBeInTheDocument()
  expect(rowOf('Sam').queryByText(/over by/)).not.toBeInTheDocument()
  expect(rowOf('Kim').queryByText(/over by/)).not.toBeInTheDocument()
})
