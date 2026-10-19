import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import SprintBoardScreen from './SprintBoardScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
  Navigate: ({ to }: { to: string }) => <div data-testid="redirect">{to}</div>,
}))
let mockSprints: unknown[]
jest.mock('@/api/sprints', () => ({ useSprints: () => ({ data: mockSprints, isLoading: false }) }))

test('opens the active sprint on the Workboard', () => {
  mockSprints = [{ id: 1, status: 'planned' }, { id: 2, status: 'active' }]
  render(<SprintBoardScreen />)
  expect(screen.getByTestId('redirect')).toHaveTextContent('/tasks?view=kanban&sprint_id=2')
})

test('with no active sprint it prompts instead of showing an empty board', () => {
  mockSprints = [{ id: 1, status: 'planned' }]
  render(<SprintBoardScreen />)
  expect(screen.getByText(/No sprint is active/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Go to sprints' })).toHaveAttribute('href', '/sprints')
})
