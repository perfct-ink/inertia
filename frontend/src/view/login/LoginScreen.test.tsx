import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import LoginScreen from './LoginScreen'

// A mutation that runs its function and then its callbacks, which is all the screen needs of react-query.
jest.mock('@tanstack/react-query', () => ({
  useMutation: ({ mutationFn, onSuccess, onError }: { mutationFn: (v: unknown) => Promise<unknown>; onSuccess: (r: unknown) => void; onError: (e: unknown) => void }) => ({
    mutate: (variables: unknown) => { Promise.resolve(mutationFn(variables)).then(onSuccess, onError) },
    isPending: false,
  }),
}))
jest.mock('@/lib/api', () => ({ __esModule: true, default: { post: jest.fn() } }))
jest.mock('@/components/auth/AuthLayout', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))

const signedIn = { headers: { authorization: 'Bearer abc' }, data: { user: { id: 5, name: 'Pat', email: 'pat@example.com' } } }

function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.pathname + location.search}</p>
}

function renderLogin(state?: unknown) {
  render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state }]}>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  )
}

function signIn() {
  fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'pat@example.com' } })
  fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null })
  ;(api.post as jest.Mock).mockResolvedValue(signedIn)
})
afterEach(() => jest.clearAllMocks())

test('signing in with nowhere to go back to opens the app home', async () => {
  renderLogin()
  signIn()
  await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/space'))
  expect(useAuthStore.getState().token).toBe('abc')
})

test('signing in goes back to the page the route guard sent the visitor away from', async () => {
  renderLogin({ from: '/documents/4?tab=1' })
  signIn()
  await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/documents/4?tab=1'))
})

test('a return address outside the app is ignored', async () => {
  renderLogin({ from: '//evil.example/space' })
  signIn()
  await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/space'))
  expect(screen.getByTestId('where')).not.toHaveTextContent('evil')
})

test('a wrong password shows the error and stays on the page', async () => {
  ;(api.post as jest.Mock).mockRejectedValue(new Error('401'))
  renderLogin({ from: '/documents/4' })
  signIn()
  expect(await screen.findByText('Invalid email or password')).toBeInTheDocument()
  expect(screen.queryByTestId('where')).not.toBeInTheDocument()
  // The refusal is tied to the password field, so a screen reader hears it on returning there.
  expect(screen.getByLabelText('Password')).toBeInvalid()
  expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Invalid email or password')
})
