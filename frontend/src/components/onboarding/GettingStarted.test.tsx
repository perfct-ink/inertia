import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import GettingStarted from './GettingStarted'
import { useAuthStore } from '@/store/auth'
import { useOnboardingStore } from '@/store/onboarding'

const mockNavigate = jest.fn()
const mockNewDocument = jest.fn().mockResolvedValue(undefined)
let mockWorkspace: Record<string, unknown>
let mockTasks: unknown[] = []

jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: mockWorkspace }) }))
jest.mock('@/api/workspaces', () => ({
  useWorkspaces: () => ({ data: [mockWorkspace] }),
  useWorkspaceMembers: () => ({ data: [] }),
  useCreateWorkspace: () => ({ mutate: jest.fn() }),
}))
jest.mock('@/api/tasks', () => ({ useTasks: () => ({ data: mockTasks }) }))
jest.mock('@/hooks/useNewDocument', () => ({ useNewDocument: () => mockNewDocument }))
jest.mock('@/hooks/useSwitchWorkspace', () => ({ useSwitchWorkspace: () => jest.fn() }))
jest.mock('@/components/workspace/WorkspaceMembers', () => ({ WorkspaceMembers: () => null }))

beforeEach(() => {
  mockWorkspace = { id: 1, name: 'My Space', personal: true, role: 'owner', root_folder_id: 10, folders: [] }
  mockTasks = []
  useAuthStore.setState({ token: 't', user: { id: 7, name: 'Ada', email: 'ada@example.com' } })
  useOnboardingStore.setState({ users: {} })
  useOnboardingStore.getState().start(7)
})
afterEach(() => jest.clearAllMocks())

test('shows every step with what Spaces are for', () => {
  render(<GettingStarted />)
  expect(screen.getByText('0 of 6 done')).toBeTruthy()
  expect(screen.getByText(/A Space keeps one project or team together/)).toBeTruthy()
  for (const label of ['New Space', 'New document', 'New Sheet', 'Add a task', 'Add people', 'Open roadmap']) {
    expect(screen.getByRole('button', { name: label })).toBeTruthy()
  }
  expect((screen.getByRole('button', { name: 'Add people' }) as HTMLButtonElement).disabled).toBe(true)
})

test('actions create documents, open tasks and record the roadmap visit', async () => {
  render(<GettingStarted />)
  fireEvent.click(screen.getByRole('button', { name: 'New Sheet' }))
  await waitFor(() => expect(mockNewDocument).toHaveBeenCalledWith('spreadsheet'))
  fireEvent.click(screen.getByRole('button', { name: 'Add a task' }))
  expect(mockNavigate).toHaveBeenCalledWith('/tasks?view=backlog&new=1')
  fireEvent.click(screen.getByRole('button', { name: 'Open roadmap' }))
  expect(mockNavigate).toHaveBeenCalledWith('/roadmap')
  expect(useOnboardingStore.getState().users[7].done).toContain('roadmap')
})

test('ticks off work done elsewhere and stays dismissed', () => {
  mockTasks = [{ id: 1 }]
  mockWorkspace = { ...mockWorkspace, folders: [{ id: 10, documents: [{ id: 3, doc_type: 'document' }], children: [] }] }
  const { container } = render(<GettingStarted />)
  expect(screen.getByText('2 of 6 done')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'New document' })).toBeNull()
  expect(useOnboardingStore.getState().users[7].done).toEqual(['document', 'tasks'])
  fireEvent.click(screen.getByRole('button', { name: 'Hide getting started' }))
  expect(container.innerHTML).toBe('')
})

test('accounts that did not just sign up never see it', () => {
  useOnboardingStore.setState({ users: {} })
  const { container } = render(<GettingStarted />)
  expect(container.innerHTML).toBe('')
})
