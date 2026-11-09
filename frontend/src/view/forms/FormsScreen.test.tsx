import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import type { TaskForm } from '@/types/taskForm'
import FormsScreen from './FormsScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }), { virtual: true })

const form = (over: Partial<TaskForm> = {}): TaskForm => ({
  id: 1, title: 'Report a bug', description: 'Tell us what broke', enabled: true, public_access: false, token: null,
  public_links_available: false, default_status: 'backlog', epic_id: null, folder_id: null, assignee_id: null, submissions_count: 3,
  created_at: '', updated_at: '',
  questions: [{ id: 'title', label: 'Title', kind: 'short_text', target: 'title', required: true, options: [] }],
  ...over,
})

let mockForms: TaskForm[]
let mockRole: string | null
const mockCreate = { mutate: jest.fn(), isPending: false, isError: false, error: null }
const mockDelete = { mutate: jest.fn() }
jest.mock('@/api/taskForms', () => ({
  useTaskForms: () => ({ data: mockForms, isLoading: false }),
  useCreateTaskForm: () => mockCreate,
  useDeleteTaskForm: () => mockDelete,
}))
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: { id: 1, role: mockRole } }) }))
jest.mock('@/api/workspaces', () => ({ canWriteWorkspace: (role: string | null | undefined) => !!role && role !== 'viewer' }))
jest.mock('@/util/errorMessage', () => ({ errorMessage: (e: { message: string }) => e.message }))

beforeEach(() => {
  jest.clearAllMocks()
  mockForms = [form(), form({ id: 2, title: 'Time off', description: null, enabled: false, public_access: true, submissions_count: 1 })]
  mockRole = 'member'
})

test('lists each form with its status, question and response counts', () => {
  render(<FormsScreen />)
  expect(screen.getByRole('heading', { name: 'Report a bug' })).toBeInTheDocument()
  expect(screen.getByText('Open to the Space')).toBeInTheDocument()
  expect(screen.getByText('1 question · 3 responses')).toBeInTheDocument()
  expect(screen.getByText('Closed')).toBeInTheDocument()
  expect(screen.getByText('1 question · 1 response')).toBeInTheDocument()
})

test('open forms can be filled in, closed ones cannot; both can be edited', () => {
  render(<FormsScreen />)
  expect(screen.getAllByRole('button', { name: 'Fill in' })).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Fill in' }))
  expect(mockNavigate).toHaveBeenCalledWith('/forms/1')
  fireEvent.click(screen.getAllByRole('button', { name: 'Edit and responses' })[1])
  expect(mockNavigate).toHaveBeenCalledWith('/forms/2/edit')
})

test('creating a form sends the title and opens the builder', () => {
  render(<FormsScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'New form' }))
  fireEvent.change(screen.getByLabelText('Form title'), { target: { value: ' Request a feature ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create form' }))
  expect(mockCreate.mutate).toHaveBeenCalledWith({ title: 'Request a feature' }, expect.anything())
  mockCreate.mutate.mock.calls[0][1].onSuccess({ id: 9 })
  expect(mockNavigate).toHaveBeenCalledWith('/forms/9/edit')
})

test('deleting asks first', () => {
  render(<FormsScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Delete Report a bug' }))
  expect(mockDelete.mutate).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
  expect(mockDelete.mutate).toHaveBeenCalledWith(1)
})

test('a viewer sees the forms but cannot create, fill in, edit or delete', () => {
  mockRole = 'viewer'
  render(<FormsScreen />)
  expect(screen.getByRole('heading', { name: 'Report a bug' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'New form' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Fill in' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Edit and responses' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /^Delete / })).not.toBeInTheDocument()
})

test('shows why a create failed', () => {
  mockCreate.isError = true
  ;(mockCreate as { error: unknown }).error = new Error('Title can’t be blank')
  render(<FormsScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'New form' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Title can’t be blank')
  mockCreate.isError = false
})
