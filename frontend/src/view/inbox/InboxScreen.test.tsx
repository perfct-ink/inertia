import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import InboxScreen from './InboxScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))
const mockRead = { mutate: jest.fn() }
const mockReadAll = { mutate: jest.fn(), isPending: false }
let mockInbox: { unread_count: number; notifications: unknown[] }
jest.mock('@/api/notifications', () => ({
  useNotifications: () => ({ data: mockInbox, isLoading: false }),
  useMarkNotificationRead: () => mockRead,
  useMarkAllNotificationsRead: () => mockReadAll,
}))

const note = (id: number, title: string, read_at: string | null = null) =>
  ({ id, kind: 'task_assigned', title, body: null, subject_type: 'Task', subject_id: 4, workspace_id: 1, read_at, created_at: new Date().toISOString() })

afterEach(() => jest.clearAllMocks())

test('opening an unread notification marks it read and goes to its subject', () => {
  mockInbox = { unread_count: 1, notifications: [note(1, 'You were assigned “Ship”')] }
  render(<InboxScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Unread: You were assigned “Ship”' }))
  expect(mockRead.mutate).toHaveBeenCalledWith(1)
  expect(mockNavigate).toHaveBeenCalledWith('/tasks?view=kanban')
})

test('a read notification is not marked again, and Mark all read is disabled with none unread', () => {
  mockInbox = { unread_count: 0, notifications: [note(2, 'Old', '2026-10-01T00:00:00Z')] }
  render(<InboxScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Old' }))
  expect(mockRead.mutate).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Mark all read' })).toBeDisabled()
})

test('mark all read and the empty state', () => {
  mockInbox = { unread_count: 2, notifications: [note(1, 'A'), note(2, 'B')] }
  const { unmount } = render(<InboxScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Mark all read' }))
  expect(mockReadAll.mutate).toHaveBeenCalled()
  unmount()
  mockInbox = { unread_count: 0, notifications: [] }
  render(<InboxScreen />)
  expect(screen.getByText(/Nothing here yet/)).toBeInTheDocument()
})
