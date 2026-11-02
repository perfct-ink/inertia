import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import EpicPlanScreen from './EpicPlanScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })

let mockQuery = 'epic_id=7'
const mockNavigate = jest.fn()
const mockSetSearchParams = jest.fn()
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(mockQuery), mockSetSearchParams],
}))

const epic = (id: number, title: string, opts: Record<string, unknown> = {}) => ({
  id, title, folder_id: null, initiative_id: null, milestone_id: null, start_date: null, target_date: null,
  tasks_count: 0, done_tasks_count: 0, horizon: null, created_at: '', updated_at: '', ...opts,
})
const task = (id: number, title: string, opts: Record<string, unknown> = {}) => ({
  id, title, description: null, status: 'todo', start_date: null, due_date: null, position: id, document_id: 1,
  assignee_id: null, epic_id: null, parent_id: null, folder_id: null, ...opts,
})

let mockEpics: unknown[] = []
let mockTasks: unknown[] = []
const mockUpdateEpic = { mutate: jest.fn() }
const mockUpdateTask = { mutateAsync: jest.fn() }
jest.mock('@/api/epics', () => ({
  useEpics: () => ({ data: mockEpics, isLoading: false }),
  useUpdateEpic: () => mockUpdateEpic,
}))
jest.mock('@/api/tasks', () => ({
  useTasks: () => ({ data: mockTasks, isLoading: false }),
  useUpdateTask: () => mockUpdateTask,
}))
jest.mock('@/api/initiatives', () => ({ useInitiatives: () => ({ data: [{ id: 1, title: 'Growth' }], isLoading: false }) }))
jest.mock('@/api/milestones', () => ({ useMilestones: () => ({ data: [], isLoading: false }) }))

function renderScreen() {
  render(<QueryClientProvider client={new QueryClient()}><EpicPlanScreen /></QueryClientProvider>)
}

const section = (name: string) => screen.getByRole('region', { name: new RegExp(`^${name}`) })

beforeEach(() => {
  mockQuery = 'epic_id=7'
  mockEpics = [
    epic(7, 'Billing', { initiative_id: 1, start_date: '2026-11-01', target_date: '2026-11-30' }),
    epic(8, 'Search'),
  ]
  mockTasks = [
    task(1, 'Write invoices', { epic_id: 7, status: 'todo', due_date: '2026-12-05' }),
    task(2, 'Ship receipts', { epic_id: 7, status: 'done' }),
    task(3, 'Loose idea', { status: 'backlog' }),
    task(4, 'Search task', { epic_id: 8 }),
  ]
  mockUpdateEpic.mutate.mockReset()
  mockUpdateTask.mutateAsync.mockReset()
  mockUpdateTask.mutateAsync.mockReturnValue(new Promise(() => undefined))
  mockSetSearchParams.mockReset()
  mockNavigate.mockReset()
})

test('asks for an epic until one is chosen, and the picker switches epics', () => {
  mockQuery = ''
  renderScreen()
  expect(screen.getByText('Choose an epic to plan its tasks.')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Epic to plan'), { target: { value: '8' } })
  expect(mockSetSearchParams).toHaveBeenCalledWith({ epic_id: '8' })
})

test('points to the epics page when the Space has none', () => {
  mockEpics = []
  renderScreen()
  expect(screen.getByText('Create an epic first, then plan its tasks here.')).toBeInTheDocument()
  expect(screen.queryByLabelText('Epic to plan')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Go to epics' }))
  expect(mockNavigate).toHaveBeenCalledWith('/epics')
})

test('says so when the epic is not in this Space', () => {
  mockQuery = 'epic_id=99'
  renderScreen()
  expect(screen.getByText('That epic is not in this Space.')).toBeInTheDocument()
})

test('shows the epic rollup, its tasks by status and the tasks that are in no epic', () => {
  renderScreen()
  const summary = screen.getByRole('region', { name: 'Billing rollup' })
  expect(summary).toHaveTextContent('Initiative: Growth')
  expect(summary).toHaveTextContent('1/2 done (50%)')
  expect(summary).toHaveTextContent('1/2 tasks dated')
  expect(summary).toHaveTextContent('Dec 5, 2026 to Dec 5, 2026')
  expect(screen.getByText('Some tasks end after the epic’s target date.')).toBeInTheDocument()

  expect(within(section('To Do')).getByText('Write invoices')).toBeInTheDocument()
  expect(within(section('Done')).getByText('Ship receipts')).toBeInTheDocument()
  expect(within(section('In Progress')).queryByText('Write invoices')).not.toBeInTheDocument()

  const backlog = screen.getByRole('complementary', { name: /^Backlog/ })
  expect(within(backlog).getByText('Loose idea')).toBeInTheDocument()
  expect(within(backlog).queryByText('Search task')).not.toBeInTheDocument()
  expect(within(backlog).queryByText('Write invoices')).not.toBeInTheDocument()
})

test('an epic with no tasks says how to add some and shows no progress', () => {
  mockTasks = [task(3, 'Loose idea', { status: 'backlog' })]
  renderScreen()
  expect(screen.getByText(/No tasks in this epic yet/)).toBeInTheDocument()
  expect(screen.queryByText(/done \(/)).not.toBeInTheDocument()
})

test('Add puts a backlog task in the epic at once and saves it', () => {
  renderScreen()
  fireEvent.click(screen.getByRole('button', { name: 'Add Loose idea to the epic' }))
  expect(mockUpdateTask.mutateAsync).toHaveBeenCalledWith({ id: 3, epic_id: 7 })
  // The save has not finished, yet the task already sits in the epic's Backlog section.
  expect(within(section('Backlog')).getByText('Loose idea')).toBeInTheDocument()
  expect(within(screen.getByRole('complementary', { name: /^Backlog/ })).queryByText('Loose idea')).not.toBeInTheDocument()
  expect(screen.getByText('Nothing left to plan.')).toBeInTheDocument()
})

test('a failed save puts the task back where the server has it', async () => {
  mockUpdateTask.mutateAsync.mockRejectedValue(new Error('nope'))
  renderScreen()
  fireEvent.click(screen.getByRole('button', { name: 'Add Loose idea to the epic' }))
  await waitFor(() => expect(within(screen.getByRole('complementary', { name: /^Backlog/ })).getByText('Loose idea')).toBeInTheDocument())
  expect(within(section('Backlog')).queryByText('Loose idea')).not.toBeInTheDocument()
})

test('a task changes status from its picker', () => {
  renderScreen()
  fireEvent.change(screen.getByLabelText('Status of Write invoices'), { target: { value: 'in_review' } })
  expect(mockUpdateTask.mutateAsync).toHaveBeenCalledWith({ id: 1, status: 'in_review' })
  expect(within(section('In Review')).getByText('Write invoices')).toBeInTheDocument()
})

test('Remove takes a task out of the epic', () => {
  renderScreen()
  fireEvent.click(screen.getByRole('button', { name: 'Remove Write invoices from the epic' }))
  expect(mockUpdateTask.mutateAsync).toHaveBeenCalledWith({ id: 1, epic_id: null })
  expect(within(screen.getByRole('complementary', { name: /^Backlog/ })).getByText('Write invoices')).toBeInTheDocument()
})

test('task dates are set and cleared from the row', () => {
  renderScreen()
  fireEvent.change(screen.getByLabelText('Start date of Write invoices'), { target: { value: '2026-11-20' } })
  expect(mockUpdateTask.mutateAsync).toHaveBeenCalledWith({ id: 1, start_date: '2026-11-20' })
  fireEvent.change(screen.getByLabelText('Due date of Write invoices'), { target: { value: '' } })
  expect(mockUpdateTask.mutateAsync).toHaveBeenCalledWith({ id: 1, due_date: null })
})

test('the epic dates are edited in the rollup', () => {
  renderScreen()
  fireEvent.change(screen.getByLabelText('Epic target'), { target: { value: '2026-12-31' } })
  expect(mockUpdateEpic.mutate).toHaveBeenCalledWith({ id: 7, target_date: '2026-12-31' })
})

test('the backlog search narrows the list', () => {
  renderScreen()
  fireEvent.change(screen.getByLabelText('Search the backlog'), { target: { value: 'zzz' } })
  expect(screen.getByText('No tasks match.')).toBeInTheDocument()
  expect(screen.queryByText('Loose idea')).not.toBeInTheDocument()
})

test('the backlog hides its search when there is nothing to plan', () => {
  mockTasks = [task(1, 'Write invoices', { epic_id: 7 })]
  renderScreen()
  expect(screen.queryByLabelText('Search the backlog')).not.toBeInTheDocument()
  expect(screen.getByText('Nothing left to plan.')).toBeInTheDocument()
})
