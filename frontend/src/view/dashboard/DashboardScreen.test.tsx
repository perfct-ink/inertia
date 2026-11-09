import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import DashboardScreen from './DashboardScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })

let mockSearch = ''
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams(mockSearch)],
}))

let mockProjectId: number | null = null
jest.mock('@/store/projects', () => ({
  useProjectStore: (select: (s: { activeProjectId: number | null }) => unknown) => select({ activeProjectId: mockProjectId }),
}))

jest.mock('@/util/errorMessage', () => ({ errorMessage: (e: Error) => `Could not load: ${e.message}` }))
jest.mock('@/hooks/useBoardStatuses', () => ({
  useBoardStatuses: () => ({ statuses: jest.requireActual('@/data/task_status').DEFAULT_BOARD_STATUSES }),
}))

const doc = (id: number, folder_id: number) => ({ id, title: `Doc ${id}`, folder_id, doc_type: 'document' })
const folder = (id: number, name: string, extra = {}) =>
  ({ id, name, kind: 'folder', parent_id: 1, position: id, archived: false, documents: [], children: [], ...extra })
const task = (id: number, folder_id: number | null, status: string, due_date: string | null = null, extra = {}) =>
  ({ id, title: `Task ${id}`, folder_id, status, due_date, ...extra })

const ok = (data: unknown) => ({ data, isLoading: false, isError: false, error: null })
let mockWorkspace: unknown
let mockTasks: unknown
let mockMilestones: unknown
let mockInitiatives: unknown
let mockSprints: unknown
jest.mock('@/api/workspace', () => ({ useWorkspace: () => mockWorkspace }))
jest.mock('@/api/tasks', () => ({ useTasks: () => mockTasks }))
jest.mock('@/api/milestones', () => ({ useMilestones: () => mockMilestones }))
jest.mock('@/api/initiatives', () => ({ useInitiatives: () => mockInitiatives }))
jest.mock('@/api/epics', () => ({ useEpics: () => ok([]) }))
jest.mock('@/api/sprints', () => ({ useSprints: () => mockSprints }))

beforeEach(() => {
  mockSearch = ''
  mockProjectId = null
  mockWorkspace = ok({
    folders: [folder(1, 'Root', {
      root: true,
      parent_id: null,
      documents: [doc(1, 1)],
      children: [
        folder(2, 'Messages', { kind: 'project', project_status: 'on_hold', documents: [doc(2, 2)], children: [folder(3, 'Design', { parent_id: 2, documents: [doc(3, 3)] })] }),
        folder(4, 'Billing'),
      ],
    })],
  })
  mockTasks = ok([
    task(1, 2, 'done'),
    task(2, 2, 'todo', '2000-01-01'),
    task(3, 3, 'in_progress', '2999-01-01', { document: { id: 9, title: 'Spec' } }),
    task(4, 4, 'backlog'),
  ])
  mockMilestones = ok([
    { id: 1, title: 'Beta', folder_id: 2, status: 'active', health: 'at_risk', target_date: '2999-12-01' },
  ])
  mockInitiatives = ok([{ id: 1, title: 'Growth', folder_id: 2, status: 'active', horizon: null, start_date: null, target_date: null, tasks_count: 0, done_tasks_count: 0 }])
  mockSprints = ok([
    { id: 7, title: 'Sprint 7', folder_id: 2, status: 'active', tasks_count: 4, done_tasks_count: 1 },
    { id: 8, title: 'Sprint 8', folder_id: 4, status: 'planned', tasks_count: 0, done_tasks_count: 0 },
  ])
})
afterEach(() => jest.clearAllMocks())

test('summarizes the whole Space: tiles, folders, boards and what is coming up', () => {
  render(<DashboardScreen />)

  const tiles = screen.getByLabelText('Summary')
  expect(within(tiles).getByText('Open tasks').nextSibling).toHaveTextContent('3')
  expect(within(tiles).getByText('Overdue').nextSibling).toHaveTextContent('1')
  expect(within(tiles).getByText('Done').nextSibling).toHaveTextContent('25%')

  const folders = screen.getByRole('region', { name: 'Folders' })
  expect(within(folders).getByRole('link', { name: 'Messages' })).toHaveAttribute('href', '/dashboard?folder=2')
  expect(within(folders).getByRole('link', { name: 'Open Messages' })).toHaveAttribute('href', '/folders/2')
  expect(folders).toHaveTextContent('On hold')
  expect(folders).toHaveTextContent('2 files')
  expect(folders).toHaveTextContent('1 overdue')
  expect(folders).toHaveTextContent('1/3')
  expect(within(folders).getByRole('link', { name: 'Billing' })).toBeInTheDocument()

  const board = screen.getByRole('region', { name: 'Task board' })
  expect(within(board).getByRole('link', { name: 'Open board' })).toHaveAttribute('href', '/tasks?view=kanban')
  expect(board).toHaveTextContent('In Progress1')
  expect(board).toHaveTextContent('Backlog1')
  expect(screen.getByRole('region', { name: 'Roadmap board' })).toHaveTextContent('Now1')
  expect(screen.getByRole('region', { name: 'Milestones' })).toHaveTextContent('Next: Beta, Dec 1, 2999')
  const sprints = screen.getByRole('region', { name: 'Sprint board' })
  expect(within(sprints).getByRole('link', { name: 'Open sprint' })).toHaveAttribute('href', '/tasks?view=kanban&sprint_id=7')
  expect(sprints).toHaveTextContent('Sprint 7: 1 of 4 tasks done25%')

  const upcoming = screen.getByRole('region', { name: 'Coming up' })
  expect(upcoming).toHaveTextContent('Task 2')
  expect(within(upcoming).getByRole('link', { name: 'Spec' })).toHaveAttribute('href', '/documents/9')
})

test('the folder picker limits the dashboard to one folder', () => {
  render(<DashboardScreen />)
  const picker = screen.getByLabelText('Folder')
  expect(within(picker).getAllByRole('option').map((o) => o.textContent)).toEqual(['All folders', 'Messages', 'Messages / Design', 'Billing'])
  fireEvent.change(picker, { target: { value: '4' } })
  expect(mockNavigate).toHaveBeenCalledWith('/dashboard?folder=4')
  fireEvent.change(picker, { target: { value: '' } })
  expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
})

test('a folder dashboard counts only that folder and what is filed in it, and links its board', () => {
  mockSearch = 'folder=2'
  render(<DashboardScreen />)
  expect(screen.getByLabelText('Folder')).toHaveValue('2')
  expect(screen.getByLabelText('Summary')).toHaveTextContent('Open tasks2')
  expect(screen.getByRole('link', { name: 'Open board' })).toHaveAttribute('href', '/tasks?view=kanban&folder_id=2')
  expect(screen.getByRole('region', { name: 'Folders' })).toHaveTextContent('Design')
  expect(screen.getByRole('region', { name: 'Roadmap board' })).toHaveTextContent('Now1')
  expect(screen.getByRole('region', { name: 'Sprint board' })).toHaveTextContent('Sprint 7')
})

test('a folder with no roadmap items or sprints shows neither card', () => {
  mockSearch = 'folder=3'
  render(<DashboardScreen />)
  expect(screen.queryByRole('region', { name: 'Roadmap board' })).not.toBeInTheDocument()
  expect(screen.queryByRole('region', { name: 'Sprint board' })).not.toBeInTheDocument()
})

test('with sprints but none active, the card links to the sprints page', () => {
  mockSearch = 'folder=4'
  render(<DashboardScreen />)
  const sprints = screen.getByRole('region', { name: 'Sprint board' })
  expect(within(sprints).getByRole('link', { name: 'Open sprints' })).toHaveAttribute('href', '/sprints')
})

test('inside an open project it covers that project and the picker lists only its folders', () => {
  mockProjectId = 2
  render(<DashboardScreen />)
  expect(screen.getByRole('heading', { name: 'Dashboard Messages' })).toBeInTheDocument()
  const picker = screen.getByLabelText('Folder')
  expect(within(picker).getAllByRole('option').map((o) => o.textContent)).toEqual(['All of Messages', 'Messages / Design'])
  expect(picker).toHaveValue('')
  expect(screen.getByLabelText('Summary')).toHaveTextContent('Open tasks2')
  expect(screen.getByRole('region', { name: 'Folders' })).toHaveTextContent('Design')
})

test('shows the error and no numbers when something fails to load', () => {
  mockTasks = { data: undefined, isLoading: false, isError: true, error: new Error('boom') }
  render(<DashboardScreen />)
  expect(screen.getByRole('alert')).toHaveTextContent('Could not load: boom')
  expect(screen.queryByLabelText('Summary')).not.toBeInTheDocument()
})

test('says so when there is nothing to summarize', () => {
  mockWorkspace = ok({ folders: [] })
  mockTasks = ok([])
  mockMilestones = ok([])
  mockInitiatives = ok([])
  mockSprints = ok([])
  render(<DashboardScreen />)
  expect(screen.getByText(/Nothing to summarize yet/)).toBeInTheDocument()
  expect(screen.queryByLabelText('Folder')).not.toBeInTheDocument()
})
