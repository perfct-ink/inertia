import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import IdeasScreen from './IdeasScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
}))
const mockCreate = { mutate: jest.fn(), isPending: false }
const mockUpdate = { mutate: jest.fn() }
const mockPromote = { mutate: jest.fn(), isPending: false }
jest.mock('@/api/ideas', () => ({
  useIdeas: () => ({
    data: [
      { id: 1, title: 'Dark mode', description: 'Please', status: 'open', promoted_type: null, submitted_by_name: 'Sam', created_at: '2026-10-02' },
      { id: 2, title: 'Offline', description: null, status: 'promoted', promoted_type: 'Initiative', submitted_by_name: null, created_at: '2026-10-01' },
      { id: 3, title: 'Skins', description: null, status: 'declined', promoted_type: null, submitted_by_name: null, created_at: '2026-10-03' },
    ],
    isLoading: false,
  }),
  useCreateIdea: () => mockCreate,
  useUpdateIdea: () => mockUpdate,
  useDeleteIdea: () => ({ mutate: jest.fn() }),
  usePromoteIdea: () => mockPromote,
}))

afterEach(() => jest.clearAllMocks())

test('submits an idea with details', () => {
  render(<IdeasScreen />)
  fireEvent.change(screen.getByLabelText('Idea'), { target: { value: 'Widgets' } })
  fireEvent.change(screen.getByLabelText('Details'), { target: { value: 'On the dashboard' } })
  fireEvent.click(screen.getByRole('button', { name: 'Submit idea' }))
  expect(mockCreate.mutate).toHaveBeenCalledWith({ title: 'Widgets', description: 'On the dashboard' }, expect.anything())
})

test('promotes an open idea to an epic or initiative, or declines it', () => {
  render(<IdeasScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Promote to epic' }))
  expect(mockPromote.mutate).toHaveBeenCalledWith({ id: 1, to: 'epic' })
  fireEvent.click(screen.getByRole('button', { name: 'Promote to initiative' }))
  expect(mockPromote.mutate).toHaveBeenCalledWith({ id: 1, to: 'initiative' })
  fireEvent.click(screen.getByRole('button', { name: 'Decline' }))
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 1, status: 'declined' })
})

test('promoted ideas link to where they went and declined ones can reopen', () => {
  render(<IdeasScreen />)
  expect(screen.getByRole('link', { name: /Initiatives/ })).toHaveAttribute('href', '/initiatives')
  fireEvent.click(screen.getByRole('button', { name: 'Reopen' }))
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 3, status: 'open' })
  expect(screen.getAllByRole('button', { name: 'Promote to epic' })).toHaveLength(1)
})
