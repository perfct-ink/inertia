import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import EpicsScreen from './EpicsScreen'

const mockNewFeature = jest.fn()
const mockDelete = { mutate: jest.fn() }
let mockEpics: unknown[] = []

jest.mock('@/components/WorkspaceLayout', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
jest.mock('@/components/PlanningTimeline', () => ({ __esModule: true, default: () => null }))
jest.mock('@/api/epics', () => ({
  useEpics: () => ({ data: mockEpics, isLoading: false }),
  useUpdateEpic: () => ({ mutate: jest.fn() }),
  useDeleteEpic: () => mockDelete,
}))
jest.mock('@/api/initiatives', () => ({ useInitiatives: () => ({ data: [] }) }))
jest.mock('@/api/milestones', () => ({ useMilestones: () => ({ data: [] }) }))
jest.mock('@/hooks/useNewFeature', () => ({ useNewFeature: () => mockNewFeature }))

const epic = (extra = {}) => ({ id: 4, title: 'Messages', document_id: 31, start_date: null, target_date: null, initiative_id: null, milestone_id: null, tasks_count: 2, done_tasks_count: 1, ...extra })

function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.pathname + location.search}</p>
}

function renderScreen() {
  render(
    <MemoryRouter initialEntries={['/epics']}>
      <Routes><Route path="*" element={<><EpicsScreen /><Where /></>} /></Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  mockEpics = [epic()]
  mockNewFeature.mockResolvedValue({ id: 9 })
})
afterEach(() => jest.clearAllMocks())

test('is called Features and lists each feature with its progress', () => {
  renderScreen()
  expect(screen.getByRole('heading', { name: 'Features' })).toBeInTheDocument()
  expect(screen.getByText('Messages')).toBeInTheDocument()
  expect(screen.getByText('1/2 done')).toBeInTheDocument()
})

test('says so when there are no features', () => {
  mockEpics = []
  renderScreen()
  expect(screen.getByText('No features yet')).toBeInTheDocument()
})

test('a feature opens its requirements document', () => {
  renderScreen()
  fireEvent.click(screen.getByRole('button', { name: 'Requirements of Messages' }))
  expect(screen.getByTestId('where')).toHaveTextContent('/documents/31')
})

test('a feature that lost its document has no Requirements link', () => {
  mockEpics = [epic({ document_id: null })]
  renderScreen()
  expect(screen.queryByRole('button', { name: /Requirements of/ })).not.toBeInTheDocument()
})

test('New feature takes a name and makes the feature, which opens its document', () => {
  renderScreen()
  fireEvent.click(screen.getByRole('button', { name: 'New feature' }))
  const name = screen.getByRole('textbox', { name: 'Feature name' })
  fireEvent.change(name, { target: { value: '  Background images ' } })
  fireEvent.keyDown(name, { key: 'Enter' })
  expect(mockNewFeature).toHaveBeenCalledWith('Background images')
})

test('a blank name makes nothing', () => {
  renderScreen()
  fireEvent.click(screen.getByRole('button', { name: 'New feature' }))
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Feature name' }), { key: 'Enter' })
  expect(mockNewFeature).not.toHaveBeenCalled()
})

test('a feature that cannot be made shows the error', async () => {
  mockNewFeature.mockRejectedValue(new Error('network'))
  renderScreen()
  fireEvent.click(screen.getByRole('button', { name: 'New feature' }))
  const name = screen.getByRole('textbox', { name: 'Feature name' })
  fireEvent.change(name, { target: { value: 'Billing' } })
  fireEvent.keyDown(name, { key: 'Enter' })
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to save. Please try again.'))
})

test('deleting a feature asks first and says what goes with it', () => {
  renderScreen()
  fireEvent.click(screen.getByRole('button', { name: 'Delete Messages' }))
  expect(mockDelete.mutate).not.toHaveBeenCalled()
  expect(screen.getByText(/requirements document and the tasks written in it are deleted too/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Delete feature' }))
  expect(mockDelete.mutate).toHaveBeenCalledWith(4)
})

test('cancelling the delete keeps the feature', () => {
  renderScreen()
  fireEvent.click(screen.getByRole('button', { name: 'Delete Messages' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(mockDelete.mutate).not.toHaveBeenCalled()
})
