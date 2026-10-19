import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import RoadmapScreen from './RoadmapScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
jest.mock('@/components/RoadmapShare', () => function ShareMock() { return null })

let mockView = 'board'
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(`view=${mockView}`)],
}))

const mockUpdateInitiative = { mutate: jest.fn() }
const mockUpdateEpic = { mutate: jest.fn() }
jest.mock('@/api/milestones', () => ({
  useMilestones: () => ({
    data: [{ id: 1, title: 'Beta', target_date: '2026-12-01', health: 'at_risk', percent: 40 }],
    isLoading: false,
  }),
}))
jest.mock('@/api/initiatives', () => ({
  useInitiatives: () => ({
    data: [{
      id: 1, title: 'Growth', status: 'active', milestone_id: 1, horizon: null, start_date: '2026-10-01', target_date: '2026-11-30',
      tasks_count: 4, done_tasks_count: 1, health: 'off_track',
    }],
    isLoading: false,
  }),
  useUpdateInitiative: () => mockUpdateInitiative,
}))
jest.mock('@/api/epics', () => ({
  useEpics: () => ({
    data: [{ id: 7, title: 'Billing', initiative_id: null, milestone_id: null, horizon: 'later', start_date: null, target_date: null, tasks_count: 0, done_tasks_count: 0 }],
    isLoading: false,
  }),
  useUpdateEpic: () => mockUpdateEpic,
}))

test('the board places cards in Now / Next / Later and moves them from the column picker', () => {
  mockView = 'board'
  render(<RoadmapScreen />)
  expect(screen.getByRole('region', { name: /Now/ })).toHaveTextContent('Growth')
  expect(screen.getByRole('region', { name: /Later/ })).toHaveTextContent('Billing')
  expect(screen.getByText('Off track')).toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('Column for Growth'), { target: { value: 'next' } })
  expect(mockUpdateInitiative.mutate).toHaveBeenCalledWith({ id: 1, horizon: 'next' })
  fireEvent.change(screen.getByLabelText('Column for Billing'), { target: { value: '' } })
  expect(mockUpdateEpic.mutate).toHaveBeenCalledWith({ id: 7, horizon: null })
})

test('the timeline groups work into milestone lanes with health', () => {
  mockView = 'timeline'
  render(<RoadmapScreen />)
  expect(screen.getByRole('region', { name: 'Beta' })).toHaveTextContent('Growth')
  expect(screen.getByText('At risk')).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'No milestone' })).toHaveTextContent('Billing')
})
