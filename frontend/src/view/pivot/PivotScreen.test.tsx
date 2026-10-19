import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import PivotScreen from './PivotScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
jest.mock('@/api/tasks', () => ({
  useTasks: () => ({
    data: [
      { id: 1, status: 'done', epic_id: 1, sprint_id: null, assignee_id: 7 },
      { id: 2, status: 'todo', epic_id: 1, sprint_id: null, assignee_id: null },
      { id: 3, status: 'todo', epic_id: null, sprint_id: null, assignee_id: 7 },
    ],
    isLoading: false,
  }),
}))
jest.mock('@/api/epics', () => ({ useEpics: () => ({ data: [{ id: 1, title: 'Onboarding' }] }) }))
jest.mock('@/api/sprints', () => ({ useSprints: () => ({ data: [] }) }))
jest.mock('@/api/workspaces', () => ({ useWorkspaceMembers: () => ({ data: [{ user_id: 7, user: { name: 'Sam' } }] }) }))

test('counts tasks by epic down the side and status across the top, with totals', () => {
  render(<PivotScreen />)
  const table = screen.getByRole('table')
  expect(within(table).getByRole('rowheader', { name: 'Onboarding' }).parentElement).toHaveTextContent('Onboarding112')
  expect(within(table).getByRole('rowheader', { name: 'No epic' }).parentElement).toHaveTextContent('No epic11')
  expect(within(table).getByRole('rowheader', { name: 'Total' }).parentElement).toHaveTextContent('Total213')
})

test('the dimensions can be changed', () => {
  render(<PivotScreen />)
  fireEvent.change(screen.getByLabelText('Rows'), { target: { value: 'assignee' } })
  expect(screen.getByRole('rowheader', { name: 'Sam' })).toBeInTheDocument()
  expect(screen.getByRole('rowheader', { name: 'Unassigned' })).toBeInTheDocument()
})
