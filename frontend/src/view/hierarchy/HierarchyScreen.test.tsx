import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import HierarchyScreen from './HierarchyScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })

const mockMutation = { mutate: jest.fn(), mutateAsync: jest.fn() }
const mockMilestones = [{
  id: 1, title: 'Beta', description: null, target_date: '2026-12-01', status: 'active', owner_id: null, folder_id: null,
  tasks_count: 0, done_tasks_count: 0, epics_count: 0, initiatives_count: 0, percent: 0, health: 'on_track',
  created_at: '', updated_at: '',
}]
let mockEpics: unknown[] = []
jest.mock('@/api/milestones', () => ({ useMilestones: () => ({ data: mockMilestones, isLoading: false }) }))
jest.mock('@/api/initiatives', () => ({ useInitiatives: () => ({ data: [], isLoading: false }), useUpdateInitiative: () => mockMutation }))
jest.mock('@/api/epics', () => ({ useEpics: () => ({ data: mockEpics, isLoading: false }), useUpdateEpic: () => mockMutation }))
jest.mock('@/api/tasks', () => ({ useTasks: () => ({ data: [], isLoading: false }), useUpdateTask: () => mockMutation }))

function renderScreen() {
  render(<QueryClientProvider client={new QueryClient()}><HierarchyScreen /></QueryClientProvider>)
}

test('hides the Unassigned label while nothing is unassigned', () => {
  mockEpics = []
  renderScreen()
  expect(screen.getByText('Beta')).toBeInTheDocument()
  expect(screen.queryByText('Unassigned')).not.toBeInTheDocument()
})

test('shows the Unassigned label once something has no parent', () => {
  mockEpics = [{
    id: 7, title: 'Loose epic', folder_id: null, initiative_id: null, milestone_id: null, start_date: null, target_date: null,
    tasks_count: 0, done_tasks_count: 0, horizon: null, created_at: '', updated_at: '',
  }]
  renderScreen()
  expect(screen.getByText('Unassigned')).toBeInTheDocument()
  expect(screen.getByText('Loose epic')).toBeInTheDocument()
})
