import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { addDays, format } from 'date-fns'
import WorkloadScreen from './WorkloadScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
const day = (n: number) => format(addDays(new Date(), n), 'yyyy-MM-dd')
jest.mock('@/api/tasks', () => ({
  useTasks: () => ({
    data: [
      { id: 1, status: 'todo', assignee_id: 7, estimate_hours: 50, start_date: format(new Date(), 'yyyy-MM-dd'), due_date: format(addDays(new Date(), 13), 'yyyy-MM-dd') },
      { id: 2, status: 'todo', assignee_id: 7, estimate_hours: null, start_date: null, due_date: format(addDays(new Date(), 2), 'yyyy-MM-dd') },
    ],
    isLoading: false,
  }),
}))
jest.mock('@/api/workspaces', () => ({ useWorkspaceMembers: () => ({ data: [{ user_id: 7, user: { name: 'Sam' } }] }) }))

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
