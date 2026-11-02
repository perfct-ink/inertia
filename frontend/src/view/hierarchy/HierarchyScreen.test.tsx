import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HierarchyScreen from './HierarchyScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })

const mockMove = { mutate: jest.fn() }
const mockMilestones = [{
  id: 1, title: 'Beta', description: null, target_date: '2026-12-01', status: 'active', owner_id: null, folder_id: null,
  tasks_count: 0, done_tasks_count: 0, epics_count: 0, initiatives_count: 0, percent: 0, health: 'on_track',
  created_at: '', updated_at: '',
}]
let mockEpics: unknown[] = []
jest.mock('@/api/milestones', () => ({ useMilestones: () => ({ data: mockMilestones, isLoading: false }) }))
jest.mock('@/api/initiatives', () => ({ useInitiatives: () => ({ data: [], isLoading: false }) }))
jest.mock('@/api/epics', () => ({ useEpics: () => ({ data: mockEpics, isLoading: false }) }))
jest.mock('@/api/tasks', () => ({ useTasks: () => ({ data: [], isLoading: false }) }))
jest.mock('@/api/hierarchy', () => ({ useMoveHierarchyItem: () => mockMove }))

function renderScreen() {
  render(<QueryClientProvider client={new QueryClient()}><HierarchyScreen /></QueryClientProvider>)
}

const looseEpic = {
  id: 7, title: 'Loose epic', folder_id: null, initiative_id: null, milestone_id: null, start_date: null, target_date: null,
  tasks_count: 0, done_tasks_count: 0, horizon: null, position: 0, created_at: '', updated_at: '',
}

beforeEach(() => mockMove.mutate.mockClear())

test('hides the Unassigned label while nothing is unassigned', () => {
  mockEpics = []
  renderScreen()
  expect(screen.getByText('Beta')).toBeInTheDocument()
  expect(screen.queryByText('Unassigned')).not.toBeInTheDocument()
})

test('shows the Unassigned label once something has no parent', () => {
  mockEpics = [looseEpic]
  renderScreen()
  expect(screen.getByText('Unassigned')).toBeInTheDocument()
  expect(screen.getByText('Loose epic')).toBeInTheDocument()
})

test('every row but a milestone has a Move button', () => {
  mockEpics = [looseEpic]
  renderScreen()
  expect(screen.getByRole('button', { name: 'Move Loose epic' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Move Beta' })).not.toBeInTheDocument()
})

test('Move lets a keyboard user pick a new parent and sends the move', () => {
  mockEpics = [looseEpic]
  renderScreen()
  fireEvent.click(screen.getByRole('button', { name: 'Move Loose epic' }))

  expect(screen.getByRole('dialog', { name: 'Move "Loose epic"' })).toBeInTheDocument()
  const moveTo = screen.getByLabelText('Move to')
  expect(moveTo).toHaveValue('unassigned')
  // Nothing has changed yet, so there is nothing to move.
  expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled()

  fireEvent.change(moveTo, { target: { value: 'milestone-1' } })
  expect(screen.getByLabelText('Place')).toHaveValue('0')
  fireEvent.click(screen.getByRole('button', { name: 'Move' }))

  expect(mockMove.mutate).toHaveBeenCalledWith(expect.objectContaining({
    item: { kind: 'epic', id: 7, changes: { initiative_id: null, milestone_id: 1, position: 0 } },
    reorders: [],
    failure: 'Couldn\'t move "Loose epic" under "Beta"',
  }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('Cancel closes the Move dialog without moving anything', () => {
  mockEpics = [looseEpic]
  renderScreen()
  fireEvent.click(screen.getByRole('button', { name: 'Move Loose epic' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(mockMove.mutate).not.toHaveBeenCalled()
})
