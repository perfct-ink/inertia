import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { TaskForm } from '@/types/taskForm'
import { DEFAULT_BOARD_STATUSES, type BoardStatuses } from '@/data/task_status'
import FormBuilderScreen from './FormBuilderScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  useParams: () => ({ id: '1' }),
  useNavigate: () => mockNavigate,
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true })

const form = (over: Partial<TaskForm> = {}): TaskForm => ({
  id: 1, title: 'Report a bug', description: null, enabled: true, public_access: false, token: null, public_links_available: true,
  default_status: 'backlog', epic_id: null, folder_id: null, assignee_id: null, submissions_count: 0, created_at: '', updated_at: '',
  questions: [
    { id: 'title', label: 'Title', kind: 'short_text', target: 'title', required: true, options: [] },
    { id: 'details', label: 'Details', kind: 'long_text', target: 'description', required: false, options: [] },
  ],
  ...over,
})

let mockForm: TaskForm
let mockRole: string | null
let mockSubmissions: unknown[]
let mockStatuses: BoardStatuses
let mockStatusFolders: (number | null | undefined)[]
const mockUpdate = { mutate: jest.fn(), isPending: false, isError: false, error: null as unknown }
jest.mock('@/api/taskForms', () => ({
  useTaskForm: () => ({ data: mockForm, isLoading: false }),
  useUpdateTaskForm: () => mockUpdate,
  useTaskFormSubmissions: () => ({ data: mockSubmissions, isLoading: false }),
}))
jest.mock('@/hooks/useBoardStatuses', () => ({
  useBoardStatuses: (folderId?: number | null) => { mockStatusFolders.push(folderId); return { statuses: mockStatuses } },
}))
jest.mock('@/api/epics', () => ({ useEpics: () => ({ data: [{ id: 4, title: 'Support' }] }) }))
jest.mock('@/api/workspaceMembers', () => ({ useWorkspaceMembers: () => ({ data: [{ id: 1, role: 'owner', user_id: 7, user: { id: 7, name: 'Mia', email: 'mia@example.com' } }] }) }))
jest.mock('@/api/workspace', () => ({
  useWorkspace: () => ({ data: { id: 1, name: 'Team', personal: false, role: mockRole, folders: [{ id: 10, name: 'Root', root: true, archived: false, children: [{ id: 11, name: 'Website', root: false, archived: false, children: [] }] }] } }),
}))
jest.mock('@/api/workspaces', () => ({
  canManageWorkspace: (role: string | null | undefined) => role === 'admin' || role === 'owner',
  canWriteWorkspace: (role: string | null | undefined) => !!role && role !== 'viewer',
}))
jest.mock('@/util/errorMessage', () => ({ errorMessage: (e: { message: string }) => e.message }))

beforeEach(() => {
  jest.clearAllMocks()
  mockForm = form()
  mockRole = 'member'
  mockSubmissions = []
  mockStatuses = DEFAULT_BOARD_STATUSES
  mockStatusFolders = []
  mockUpdate.isError = false
  mockUpdate.error = null
})

test('saves the settings and questions as edited', () => {
  render(<FormBuilderScreen />)
  fireEvent.change(screen.getByLabelText('Title', { selector: 'input[aria-required]' }), { target: { value: 'Report a problem' } })
  fireEvent.change(screen.getByLabelText('Epic'), { target: { value: '4' } })
  fireEvent.change(screen.getByLabelText('Folder or project'), { target: { value: '11' } })
  fireEvent.change(screen.getByLabelText('Assign to'), { target: { value: '7' } })
  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'todo' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save form' }))

  expect(mockUpdate.mutate).toHaveBeenCalledWith(
    expect.objectContaining({ id: 1, title: 'Report a problem', epic_id: 4, folder_id: 11, assignee_id: 7, default_status: 'todo', enabled: true }),
    expect.anything(),
  )
  expect(mockUpdate.mutate.mock.calls[0][0]).not.toHaveProperty('public_access')
  mockUpdate.mutate.mock.calls[0][1].onSuccess()
})

test('adds, edits, reorders and removes questions', () => {
  render(<FormBuilderScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Add question' }))
  fireEvent.change(screen.getByLabelText('Question 3 label'), { target: { value: 'Severity' } })
  fireEvent.change(within(screen.getByRole('listitem', { name: 'Question 3' })).getByLabelText('Type'), { target: { value: 'choice' } })
  fireEvent.change(screen.getByLabelText('Question 3 choices'), { target: { value: 'High\nLow\n' } })
  fireEvent.click(screen.getByRole('button', { name: 'Move question 3 up' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save form' }))

  const { questions } = mockUpdate.mutate.mock.calls[0][0]
  expect(questions.map((q: { id: string }) => q.id)).toEqual(['title', 'q3', 'details'])
  expect(questions[1]).toMatchObject({ label: 'Severity', kind: 'choice', target: 'details', options: ['High', 'Low'] })
})

test('the title question cannot be removed, others can', () => {
  render(<FormBuilderScreen />)
  expect(screen.getByRole('button', { name: 'Remove question 1' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Remove question 2' }))
  expect(screen.queryByLabelText('Question 2 label')).not.toBeInTheDocument()
})

test('a part of the task that another question fills in is not offered again', () => {
  render(<FormBuilderScreen />)
  const second = within(screen.getByRole('listitem', { name: 'Question 2' }))
  const options = Array.from(second.getByLabelText('Fills in').querySelectorAll('option')).map((o) => o.textContent)
  expect(options).toEqual(['Task description', 'Extra detail in the description'])
})

test('shows why a save failed', () => {
  mockUpdate.isError = true
  mockUpdate.error = new Error('A form needs a question for the task’s title')
  render(<FormBuilderScreen />)
  expect(screen.getByRole('alert')).toHaveTextContent('A form needs a question')
})

test('a member does not see the public link section while the form is private', () => {
  render(<FormBuilderScreen />)
  expect(screen.queryByRole('heading', { name: 'Public link' })).not.toBeInTheDocument()
})

test('an admin turns the public link on and sends public_access with the save', () => {
  mockRole = 'admin'
  render(<FormBuilderScreen />)
  fireEvent.click(screen.getByLabelText(/Anyone with the link/))
  expect(screen.getByText('Save the form to get its link.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Save form' }))
  expect(mockUpdate.mutate.mock.calls[0][0]).toHaveProperty('public_access', true)
})

test('a public form shows its link and a copy button', async () => {
  mockRole = 'admin'
  mockForm = form({ public_access: true, token: 'tok123' })
  const writeText = jest.fn().mockResolvedValue(undefined)
  Object.assign(navigator, { clipboard: { writeText } })
  render(<FormBuilderScreen />)
  const link = screen.getByLabelText('Link to share') as HTMLInputElement
  expect(link.value).toMatch(/\/f\/tok123$/)
  expect(link.value).not.toContain('#')
  fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
  expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  expect(writeText).toHaveBeenCalledWith(link.value)
})

test('public links switched off on the server cannot be turned on', () => {
  mockRole = 'owner'
  mockForm = form({ public_links_available: false })
  render(<FormBuilderScreen />)
  expect(screen.getByLabelText(/Anyone with the link/)).toBeDisabled()
  expect(screen.getByText(/switched off on this server/)).toBeInTheDocument()
})

test('lists the responses with who sent them and their answers', () => {
  mockSubmissions = [
    { id: 1, task_id: 5, task_title: 'Dark mode', task_status: 'backlog', submitted_by_name: null, created_at: '2026-11-02T10:00:00Z', answers: [{ label: 'Title', value: 'Dark mode' }] },
  ]
  render(<FormBuilderScreen />)
  expect(screen.getByText('Dark mode', { selector: 'p' })).toBeInTheDocument()
  expect(screen.getByText(/Public link · Nov 2, 2026 · Backlog/)).toBeInTheDocument()
})

test('the status picker and the responses use the names of the folder the tasks go to', () => {
  mockStatuses = { ...DEFAULT_BOARD_STATUSES, todo: { label: 'Ready', color: 'blue' }, backlog: { label: 'Inbox', color: 'gray' } }
  mockSubmissions = [
    { id: 1, task_id: 5, task_title: 'Dark mode', task_status: 'backlog', submitted_by_name: 'Mia', created_at: '2026-11-02T10:00:00Z', answers: [] },
  ]
  render(<FormBuilderScreen />)
  const options = Array.from(screen.getByLabelText('Status').querySelectorAll('option')).map((o) => o.textContent)
  expect(options).toEqual(['Inbox', 'Ready', 'In Progress', 'In Review', 'Done'])
  expect(screen.getByText(/Mia · Nov 2, 2026 · Inbox/)).toBeInTheDocument()
})

test('choosing a folder asks for that folder’s status names', () => {
  render(<FormBuilderScreen />)
  fireEvent.change(screen.getByLabelText('Folder or project'), { target: { value: '11' } })
  expect(mockStatusFolders).toContain(11)
})

test('a viewer cannot edit a form', () => {
  mockRole = 'viewer'
  render(<FormBuilderScreen />)
  expect(screen.getByRole('status')).toHaveTextContent('view-only access')
  expect(screen.queryByRole('button', { name: 'Save form' })).not.toBeInTheDocument()
})
