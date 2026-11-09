import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import InitiativesScreen from './InitiativesScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
jest.mock('@/components/PlanningTimeline', () => function TimelineMock() { return <div>Timeline drawn</div> })
const mockDelete = { mutate: jest.fn() }
jest.mock('@/api/initiatives', () => ({
  useInitiatives: () => ({
    data: [{ id: 5, title: 'Launch', done_tasks_count: 2, tasks_count: 3, start_date: null, target_date: null, milestone_id: null, owner_id: null, status: 'planned' }],
    isLoading: false,
  }),
  useCreateInitiative: () => ({ mutate: jest.fn() }),
  useUpdateInitiative: () => ({ mutate: jest.fn() }),
  useDeleteInitiative: () => mockDelete,
}))
jest.mock('@/api/milestones', () => ({ useMilestones: () => ({ data: [] }) }))
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: { role: 'member' } }) }))
jest.mock('@/api/workspaceMembers', () => ({ useWorkspaceMembers: () => ({ data: [] }) }))

afterEach(() => jest.clearAllMocks())

function Where() {
  return <p data-testid="where">{useLocation().search}</p>
}

function renderScreen(path = '/initiatives') {
  render(<MemoryRouter initialEntries={[path]}><InitiativesScreen /><Where /></MemoryRouter>)
}

test('the list and timeline tabs show which view is open and navigate to the other', () => {
  renderScreen()
  expect(screen.getByRole('group', { name: 'View' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Timeline' })).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(screen.getByRole('button', { name: 'Timeline' }))
  expect(screen.getByTestId('where')).toHaveTextContent('?view=timeline')
  expect(screen.getByText('Timeline drawn')).toBeInTheDocument()
})

test('the delete button removes the initiative without opening it', () => {
  renderScreen()
  fireEvent.click(screen.getByRole('button', { name: 'Delete initiative' }))
  expect(mockDelete.mutate).toHaveBeenCalledWith(5)
  expect(screen.getByTestId('where')).toHaveTextContent('')
})
