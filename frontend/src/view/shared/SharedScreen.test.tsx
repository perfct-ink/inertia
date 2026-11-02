import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import SharedScreen from './SharedScreen'

let mockState: Record<string, unknown>
jest.mock('react-router-dom', () => ({ useParams: () => ({ token: 'abc' }) }))
jest.mock('@/api/roadmapShare', () => ({ useSharedRoadmap: () => mockState }))
jest.mock('@/components/RoadmapTimeline', () => function TimelineMock() { return <div>timeline</div> })

test('shows the roadmap read-only for a valid link', () => {
  mockState = { data: { name: 'Acme', milestones: [], initiatives: [], epics: [] }, isLoading: false, isError: false }
  render(<SharedScreen />)
  expect(screen.getByRole('heading', { name: 'Acme roadmap' })).toBeInTheDocument()
  expect(screen.getByText('timeline')).toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

test('explains an unavailable link', () => {
  mockState = { data: undefined, isLoading: false, isError: true }
  render(<SharedScreen />)
  expect(screen.getByText(/isn.t available/)).toBeInTheDocument()
})
