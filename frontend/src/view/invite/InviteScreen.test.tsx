import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import InviteScreen from './InviteScreen'

let mockToken: string | null = null
const mockAccept = { mutate: jest.fn(), isPending: false, isError: false }
const mockSwitch = jest.fn()

jest.mock('@/components/auth/AuthLayout', () => function LayoutMock({ title, children }: { title: string; children: React.ReactNode }) { return <div><h1>{title}</h1>{children}</div> })
jest.mock('react-router-dom', () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
  useParams: () => ({ token: 'tok123' }),
}))
jest.mock('@/store/auth', () => ({ useAuthStore: (select: (s: { token: string | null }) => unknown) => select({ token: mockToken }) }))
jest.mock('@/api/workspaces', () => ({ useAcceptInvitation: () => mockAccept }))
jest.mock('@/hooks/useSwitchWorkspace', () => ({ useSwitchWorkspace: () => mockSwitch }))

beforeEach(() => { mockAccept.mutate.mockClear(); mockAccept.isError = false })

test('signed out: asks the visitor to sign in or sign up first', () => {
  mockToken = null
  render(<InviteScreen />)
  expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/signup')
  expect(screen.queryByRole('button', { name: 'Join Space' })).not.toBeInTheDocument()
})

test('signed in: joining sends the token and then switches to the Space', () => {
  mockToken = 'jwt'
  render(<InviteScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Join Space' }))
  expect(mockAccept.mutate).toHaveBeenCalledWith('tok123', { onSuccess: mockSwitch })
})

test('signed in: a rejected invitation explains why', () => {
  mockToken = 'jwt'
  mockAccept.isError = true
  render(<InviteScreen />)
  expect(screen.getByText(/no longer valid, or it was sent to a different email/)).toBeInTheDocument()
})
