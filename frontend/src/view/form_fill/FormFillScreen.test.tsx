import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import type { TaskForm } from '@/types/taskForm'
import FormFillScreen from './FormFillScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
jest.mock('react-router-dom', () => ({
  useParams: () => ({ id: '5' }),
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
}), { virtual: true })

const form = (over: Partial<TaskForm> = {}): TaskForm => ({
  id: 5, title: 'Report a bug', description: 'Tell us what broke', enabled: true, public_access: false, token: null,
  public_links_available: false, default_status: 'backlog', epic_id: null, folder_id: null, assignee_id: null, submissions_count: 0,
  created_at: '', updated_at: '',
  questions: [{ id: 'title', label: 'Title', kind: 'short_text', target: 'title', required: true, options: [] }],
  ...over,
})

let mockForm: TaskForm | undefined
let mockRole: string | null
let mockSubmit: { mutate: jest.Mock; reset: jest.Mock; isPending: boolean; isSuccess: boolean; isError: boolean; error: unknown; data?: { task_title: string } }
jest.mock('@/api/taskForms', () => ({
  useTaskForm: () => ({ data: mockForm, isLoading: false }),
  useSubmitTaskForm: () => mockSubmit,
}))
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: { id: 1, role: mockRole } }) }))
jest.mock('@/api/workspaces', () => ({ canWriteWorkspace: (role: string | null | undefined) => !!role && role !== 'viewer' }))
jest.mock('@/util/errorMessage', () => ({ errorMessage: (e: { message: string }) => e.message }))

beforeEach(() => {
  mockForm = form()
  mockRole = 'member'
  mockSubmit = { mutate: jest.fn(), reset: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null }
})

test('a member fills in the form and the answers are sent', () => {
  render(<FormFillScreen />)
  expect(screen.getByRole('heading', { name: 'Report a bug' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Login broken' } })
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
  expect(mockSubmit.mutate).toHaveBeenCalledWith({ title: 'Login broken' })
})

test('after sending, names the task that was made and offers to fill in again', () => {
  mockSubmit.isSuccess = true
  mockSubmit.data = { task_title: 'Login broken' }
  render(<FormFillScreen />)
  expect(screen.getByRole('status')).toHaveTextContent('Created the task “Login broken”')
  fireEvent.click(screen.getByRole('button', { name: 'Fill in again' }))
  expect(mockSubmit.reset).toHaveBeenCalled()
})

test('a closed form, a viewer and a missing form each get a plain message instead of the form', () => {
  mockForm = form({ enabled: false })
  const { unmount } = render(<FormFillScreen />)
  expect(screen.getByRole('status')).toHaveTextContent('is closed')
  expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument()
  unmount()

  mockForm = form()
  mockRole = 'viewer'
  const second = render(<FormFillScreen />)
  expect(screen.getByRole('status')).toHaveTextContent('view-only access')
  second.unmount()

  mockForm = undefined
  render(<FormFillScreen />)
  expect(screen.getByRole('alert')).toHaveTextContent('doesn’t exist')
})

test('a failed send shows the reason', () => {
  mockSubmit.isError = true
  mockSubmit.error = new Error('Title can’t be blank')
  render(<FormFillScreen />)
  expect(screen.getByRole('alert')).toHaveTextContent('Title can’t be blank')
})
