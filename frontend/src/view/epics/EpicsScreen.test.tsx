import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import EpicsScreen from './EpicsScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
jest.mock('@/components/PlanningTimeline', () => function TimelineMock() { return <div>Timeline drawn</div> })
const mockDelete = { mutate: jest.fn() }
jest.mock('@/api/epics', () => ({
  useEpics: () => ({
    data: [{ id: 7, title: 'Background images', done_tasks_count: 1, tasks_count: 4, start_date: null, target_date: null, initiative_id: null, milestone_id: null }],
    isLoading: false,
  }),
  useCreateEpic: () => ({ mutate: jest.fn() }),
  useUpdateEpic: () => ({ mutate: jest.fn() }),
  useDeleteEpic: () => mockDelete,
}))
jest.mock('@/api/initiatives', () => ({ useInitiatives: () => ({ data: [] }) }))
jest.mock('@/api/milestones', () => ({ useMilestones: () => ({ data: [] }) }))

afterEach(() => jest.clearAllMocks())

function renderScreen(path = '/epics') {
  render(<MemoryRouter initialEntries={[path]}><EpicsScreen /></MemoryRouter>)
}

test('the list and timeline tabs show which view is open and switch it', () => {
  renderScreen()
  const list = screen.getByRole('button', { name: 'List' })
  const timeline = screen.getByRole('button', { name: 'Timeline' })
  expect(screen.getByRole('group', { name: 'View' })).toBeInTheDocument()
  expect(list).toHaveAttribute('aria-pressed', 'true')
  expect(timeline).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getByText('Background images')).toBeInTheDocument()
  fireEvent.click(timeline)
  expect(screen.getByText('Timeline drawn')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Timeline' })).toHaveAttribute('aria-pressed', 'true')
})

test('the delete button removes the epic', () => {
  renderScreen()
  fireEvent.click(screen.getByRole('button', { name: 'Delete epic' }))
  expect(mockDelete.mutate).toHaveBeenCalledWith(7)
})

test('a filter by initiative can be cleared', () => {
  renderScreen('/epics?initiative_id=3')
  expect(screen.getByRole('button', { name: 'Clear initiative filter' })).toBeInTheDocument()
})
