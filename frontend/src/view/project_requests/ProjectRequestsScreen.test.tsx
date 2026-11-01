import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { useAuthStore } from '@/store/auth'
import type { ProjectRequest } from '@/types'
import ProjectRequestsScreen from './ProjectRequestsScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
}))

const request = (over: Partial<ProjectRequest>): ProjectRequest => ({
  id: 1, name: 'Billing revamp', description: 'Rework invoicing', justification: 'Finance asked', priority: 'high', status: 'pending',
  start_date: '2026-12-01', target_date: '2027-02-01', decision_note: null, decided_at: null, project_id: null,
  requested_by_id: 7, requested_by_name: 'Mia', decided_by_id: null, decided_by_name: null,
  created_at: '2026-11-01T12:00:00Z', updated_at: '2026-11-01T12:00:00Z', ...over,
})

let mockRequests: ProjectRequest[] = []
let mockRole: string | null = 'member'
const mockCreate = { mutate: jest.fn(), isPending: false }
const mockUpdate = { mutate: jest.fn(), isPending: false }
const mockDelete = { mutate: jest.fn() }
const mockDecide = { mutate: jest.fn(), isPending: false }
jest.mock('@/api/projectRequests', () => ({
  useProjectRequests: () => ({ data: mockRequests, isLoading: false }),
  useCreateProjectRequest: () => mockCreate,
  useUpdateProjectRequest: () => mockUpdate,
  useDeleteProjectRequest: () => mockDelete,
  useDecideProjectRequest: () => mockDecide,
}))
jest.mock('@/api/workspace', () => ({
  useWorkspace: () => ({ data: { id: 1, name: 'Team', personal: false, role: mockRole, folders: [] } }),
}))
jest.mock('@/api/workspaces', () => ({
  canManageWorkspace: (role: string | null | undefined) => role === 'admin' || role === 'owner',
  canWriteWorkspace: (role: string | null | undefined) => !!role && role !== 'viewer',
}))

beforeEach(() => {
  jest.clearAllMocks()
  useAuthStore.setState({ token: 'token', user: { id: 7, name: 'Mia', email: 'mia@example.com' } })
  mockRole = 'member'
  mockRequests = [
    request({ id: 1 }),
    request({ id: 2, name: 'Mobile app', requested_by_id: 8, requested_by_name: 'Otto', justification: null }),
    request({
      id: 3, name: 'Data warehouse', status: 'approved', project_id: 42, decided_by_id: 1, decided_by_name: 'Owen',
      decided_at: '2026-11-02T12:00:00Z', decision_note: 'Fund it',
    }),
    request({ id: 4, name: 'Rebrand', status: 'declined', decided_by_name: 'Owen', decision_note: 'No budget' }),
  ]
})

test('lists pending requests first with their details and a count on each tab', () => {
  render(<ProjectRequestsScreen />)
  expect(screen.getByRole('heading', { name: 'Billing revamp' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Mobile app' })).toBeInTheDocument()
  expect(screen.queryByRole('heading', { name: 'Data warehouse' })).not.toBeInTheDocument()
  expect(screen.getByText(/Requested by Mia on .* · High priority · Dec 1, 2026 to Feb 1, 2027/)).toBeInTheDocument()
  expect(screen.getByText('Rework invoicing')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Pending (2)' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Approved (1)' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Declined (1)' })).toBeInTheDocument()
})

test('a member can edit and withdraw their own request but not decide or touch others', () => {
  render(<ProjectRequestsScreen />)
  const own = screen.getByRole('article', { name: 'Billing revamp' })
  expect(within(own).getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  expect(within(own).getByRole('button', { name: 'Withdraw' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument()

  const others = screen.getByRole('article', { name: 'Mobile app' })
  expect(within(others).queryByRole('button')).not.toBeInTheDocument()
})

test('a viewer can read requests but not submit or change them', () => {
  mockRole = 'viewer'
  render(<ProjectRequestsScreen />)
  expect(screen.getByRole('heading', { name: 'Billing revamp' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'New request' })).not.toBeInTheDocument()
  // Their own pending request offers no actions either, whatever their role used to be.
  expect(within(screen.getByRole('article', { name: 'Billing revamp' })).queryByRole('button')).not.toBeInTheDocument()
})

test('submits a new request from the intake form', () => {
  render(<ProjectRequestsScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'New request' }))
  const form = screen.getByRole('form', { name: 'Project request' })

  fireEvent.click(within(form).getByRole('button', { name: 'Submit request' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Give the project a name.')
  expect(mockCreate.mutate).not.toHaveBeenCalled()

  fireEvent.change(within(form).getByLabelText('Project name'), { target: { value: '  Support portal ' } })
  fireEvent.change(within(form).getByLabelText('Why does it matter?'), { target: { value: 'Tickets are slow' } })
  fireEvent.change(within(form).getByLabelText('Priority'), { target: { value: 'low' } })
  fireEvent.change(within(form).getByLabelText('Target date'), { target: { value: '2027-03-01' } })
  fireEvent.click(within(form).getByRole('button', { name: 'Submit request' }))

  expect(mockCreate.mutate).toHaveBeenCalledWith(
    {
      name: 'Support portal', description: null, justification: 'Tickets are slow', priority: 'low',
      start_date: null, target_date: '2027-03-01',
    },
    expect.anything(),
  )
})

test('rejects a target date before the start date without calling the server', () => {
  render(<ProjectRequestsScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'New request' }))
  const form = screen.getByRole('form', { name: 'Project request' })
  fireEvent.change(within(form).getByLabelText('Project name'), { target: { value: 'Portal' } })
  fireEvent.change(within(form).getByLabelText('Start date'), { target: { value: '2027-03-01' } })
  fireEvent.change(within(form).getByLabelText('Target date'), { target: { value: '2027-02-01' } })
  fireEvent.click(within(form).getByRole('button', { name: 'Submit request' }))
  expect(screen.getByRole('alert')).toHaveTextContent('The target date cannot be before the start date.')
  expect(mockCreate.mutate).not.toHaveBeenCalled()
})

test('editing a request starts from its saved values and saves the changes', () => {
  render(<ProjectRequestsScreen />)
  fireEvent.click(within(screen.getByRole('article', { name: 'Billing revamp' })).getByRole('button', { name: 'Edit' }))
  const form = screen.getByRole('form', { name: 'Project request' })
  expect(within(form).getByLabelText('Project name')).toHaveValue('Billing revamp')
  fireEvent.change(within(form).getByLabelText('Project name'), { target: { value: 'Billing v2' } })
  fireEvent.click(within(form).getByRole('button', { name: 'Save changes' }))
  expect(mockUpdate.mutate).toHaveBeenCalledWith(
    expect.objectContaining({ id: 1, name: 'Billing v2', priority: 'high', start_date: '2026-12-01' }),
    expect.anything(),
  )
})

test('an admin approves a request, optionally with a note', () => {
  mockRole = 'admin'
  render(<ProjectRequestsScreen />)
  fireEvent.click(within(screen.getByRole('article', { name: 'Mobile app' })).getByRole('button', { name: 'Approve' }))

  const dialog = screen.getByRole('dialog', { name: 'Approve project' })
  expect(dialog).toHaveTextContent('creates it as a project')
  fireEvent.change(within(dialog).getByLabelText('Note (optional)'), { target: { value: 'Start in Q1' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Approve' }))
  expect(mockDecide.mutate).toHaveBeenCalledWith(
    { id: 2, decision: 'approve', decision_note: 'Start in Q1' },
    expect.anything(),
  )
})

test('declining needs a reason', () => {
  mockRole = 'owner'
  render(<ProjectRequestsScreen />)
  fireEvent.click(within(screen.getByRole('article', { name: 'Mobile app' })).getByRole('button', { name: 'Decline' }))

  const dialog = screen.getByRole('dialog', { name: 'Decline project' })
  const submit = within(dialog).getByRole('button', { name: 'Decline' })
  expect(submit).toBeDisabled()
  fireEvent.change(within(dialog).getByLabelText('Reason'), { target: { value: 'Out of scope' } })
  expect(submit).toBeEnabled()
  fireEvent.click(submit)
  expect(mockDecide.mutate).toHaveBeenCalledWith(
    { id: 2, decision: 'decline', decision_note: 'Out of scope' },
    expect.anything(),
  )
})

test('shows who decided an approved request, with a link to its project', () => {
  render(<ProjectRequestsScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Approved (1)' }))
  const card = screen.getByRole('article', { name: 'Data warehouse' })
  expect(card).toHaveTextContent(/Approved by Owen on .*: Fund it/)
  expect(within(card).getByRole('link', { name: 'Open project' })).toHaveAttribute('href', '/folders/42')
  expect(screen.queryByRole('heading', { name: 'Billing revamp' })).not.toBeInTheDocument()
})

test('an admin can reopen a declined request and delete any request', () => {
  mockRole = 'admin'
  render(<ProjectRequestsScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Declined (1)' }))
  const card = screen.getByRole('article', { name: 'Rebrand' })
  expect(card).toHaveTextContent('Declined by Owen')
  expect(card).toHaveTextContent('No budget')
  fireEvent.click(within(card).getByRole('button', { name: 'Reopen' }))
  expect(mockDecide.mutate).toHaveBeenCalledWith({ id: 4, decision: 'reopen' })

  fireEvent.click(within(card).getByRole('button', { name: 'Delete' }))
  const dialog = screen.getByRole('dialog', { name: 'Delete request' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
  expect(mockDelete.mutate).toHaveBeenCalledWith(4)
})

test('the empty state explains what to do', () => {
  mockRequests = []
  render(<ProjectRequestsScreen />)
  expect(screen.getByText(/No project requests yet\./)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Pending/ })).not.toBeInTheDocument()
})
