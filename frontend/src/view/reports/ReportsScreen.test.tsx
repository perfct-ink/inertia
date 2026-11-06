import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import ReportsScreen from './ReportsScreen'
import { addDays, dayKey } from '@/data/report'

let mockTasks: unknown[] = []
let mockSprints: unknown[] = []
let mockChanges: unknown[] = []
let mockState = { tasksLoading: false, tasksError: false }

jest.mock('@/components/WorkspaceLayout', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
jest.mock('@/api/tasks', () => ({ useTasks: () => ({ data: mockTasks, isLoading: mockState.tasksLoading, isError: mockState.tasksError }) }))
jest.mock('@/api/sprints', () => ({ useSprints: () => ({ data: mockSprints, isLoading: false, isError: false }) }))
jest.mock('@/api/taskStatusEvents', () => ({ useTaskStatusEvents: () => ({ data: mockChanges, isLoading: false, isError: false }) }))
jest.mock('@/hooks/useBoardStatuses', () => ({
  useBoardStatuses: () => ({
    statuses: {
      backlog: { label: 'Backlog', color: 'gray' }, todo: { label: 'To Do', color: 'blue' }, in_progress: { label: 'In Progress', color: 'yellow' },
      in_review: { label: 'In Review', color: 'purple' }, done: { label: 'Done', color: 'green' },
    },
  }),
}))

const today = dayKey(new Date())
const day = (offset: number) => addDays(today, offset)
const at = (offset: number, hour = 12) => {
  const [y, m, d] = day(offset).split('-').map(Number)
  return new Date(y, m - 1, d, hour).toISOString()
}

const sprint = (id: number, title: string, status: string, start: number | null, end: number | null) => ({
  id, title, status, start_date: start === null ? null : day(start), end_date: end === null ? null : day(end), created_at: at(-20),
})
const task = (id: number, sprintId: number | null, status: string, points: number | null, createdOffset = -9) => ({
  id, sprint_id: sprintId, status, story_points: points, actual_story_points: null, created_at: at(createdOffset),
})

function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.search}</p>
}

function renderAt(search = '') {
  render(
    <MemoryRouter initialEntries={[`/reports${search}`]}>
      <Routes><Route path="*" element={<><ReportsScreen /><Where /></>} /></Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  mockSprints = [sprint(1, 'Sprint 1', 'closed', -18, -9), sprint(2, 'Sprint 2', 'active', -8, 5), sprint(3, 'Sprint 3', 'planned', 6, 19)]
  mockTasks = [task(1, 1, 'done', 5, -19), task(2, 1, 'done', 3, -19), task(3, 2, 'done', 5, -9), task(4, 2, 'todo', 8, -9), task(5, 2, 'todo', 2, -3), task(6, 2, 'todo', null, -2), task(7, null, 'backlog', null, -2)]
  mockChanges = [
    { id: 1, task_id: 3, from_status: 'todo', to_status: 'done', created_at: at(-4) },
  ]
  mockState = { tasksLoading: false, tasksError: false }
})

test('opens the burndown of the running sprint in story points', () => {
  renderAt()
  expect(screen.getByRole('heading', { name: 'Reports' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Burndown' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('img', { name: 'Burndown of Sprint 2' })).toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: 'Sprint' })).toHaveValue('2')
  expect(screen.getByRole('combobox', { name: 'Count' })).toHaveValue('points')
  expect(screen.getByText(/Sprint 2: .* left on .*, from .* planned at the start\./)).toBeInTheDocument()
})

test('a planned sprint is not offered; the finished and running ones are, newest first', () => {
  renderAt()
  const options = within(screen.getByRole('combobox', { name: 'Sprint' })).getAllByRole('option').map((o) => o.textContent)
  expect(options).toEqual(['Sprint 2', 'Sprint 1'])
})

test('the numbers are one click away in a table', () => {
  renderAt()
  const table = screen.getByRole('table', { name: 'Sprint 2, per day' })
  expect(within(table).getByRole('columnheader', { name: 'Remaining' })).toBeInTheDocument()
  expect(within(table).getAllByRole('row').length).toBeGreaterThan(5)
})

test('tasks without story points are called out when counting points, and not when counting tasks', () => {
  renderAt()
  expect(screen.getByText(/1 task has no story points and counts as 0\. Give it points/)).toBeInTheDocument()
  fireEvent.change(screen.getByRole('combobox', { name: 'Count' }), { target: { value: 'tasks' } })
  expect(screen.getByTestId('where')).toHaveTextContent('measure=tasks')
  expect(screen.queryByText(/no story points/)).not.toBeInTheDocument()
})

test('switching report keeps the choice in the address', () => {
  renderAt()
  fireEvent.click(screen.getByRole('button', { name: 'Velocity' }))
  expect(screen.getByTestId('where')).toHaveTextContent('report=velocity')
  expect(screen.getByRole('img', { name: 'Velocity by sprint' })).toBeInTheDocument()
  expect(screen.getByText(/Average of the last finished sprints: 8 points per sprint\./)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Burndown' }))
  expect(screen.getByTestId('where')).not.toHaveTextContent('report=')
})

test('a link opens the report it names', () => {
  renderAt('?report=scope&measure=tasks')
  expect(screen.getByRole('button', { name: 'Planned vs. unplanned' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('img', { name: 'Planned and unplanned work by sprint' })).toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: 'Count' })).toHaveValue('tasks')
})

test('the flow chart covers all work for a period, or one sprint', () => {
  renderAt('?report=flow')
  expect(screen.getByRole('img', { name: 'Cumulative flow' })).toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: 'Period' })).toHaveValue('30')
  expect(screen.getByRole('combobox', { name: 'Sprint' })).toHaveValue('')
  fireEvent.change(screen.getByRole('combobox', { name: 'Sprint' }), { target: { value: '2' } })
  expect(screen.getByTestId('where')).toHaveTextContent('sprint=2')
  expect(screen.queryByRole('combobox', { name: 'Period' })).not.toBeInTheDocument()
})

test('the flow legend uses the board status names', () => {
  renderAt('?report=flow')
  const legend = screen.getByRole('list', { name: 'Legend' })
  expect(within(legend).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'])
})

test('with no sprint started, each sprint report says what to do', () => {
  mockSprints = [sprint(3, 'Sprint 3', 'planned', 6, 19)]
  renderAt()
  expect(screen.getByText(/Start a sprint with a start and end date/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Velocity' }))
  expect(screen.getByText(/No sprint has started yet, so there is no velocity/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Planned vs. unplanned' }))
  expect(screen.getByText(/how much work was added after it began/)).toBeInTheDocument()
})

test('a running sprint without dates cannot burn down', () => {
  mockSprints = [sprint(2, 'Sprint 2', 'active', null, null)]
  renderAt()
  expect(screen.getByText(/Sprint 2 has no start and end dates/)).toBeInTheDocument()
})

test('with no tasks the flow chart says so', () => {
  mockTasks = []
  renderAt('?report=flow')
  expect(screen.getByText('There are no tasks yet to show.')).toBeInTheDocument()
})

test('shows a spinner while loading', () => {
  mockState = { tasksLoading: true, tasksError: false }
  renderAt()
  expect(document.querySelector('.planning-spinner')).toBeInTheDocument()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})

test('says so when the data could not load', () => {
  mockState = { tasksLoading: false, tasksError: true }
  renderAt()
  expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load the report data.")
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})
