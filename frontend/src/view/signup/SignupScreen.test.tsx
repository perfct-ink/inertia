import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import api from '@/lib/api'
import SignupScreen from './SignupScreen'

jest.mock('@tanstack/react-query', () => ({
  useMutation: ({ mutationFn, onSuccess, onError }: { mutationFn: (v: unknown) => Promise<unknown>; onSuccess: (r: unknown) => void; onError: (e: unknown) => void }) => ({
    mutate: (variables: unknown) => { Promise.resolve(mutationFn(variables)).then(onSuccess, onError) },
    isPending: false,
  }),
}))
jest.mock('@/lib/api', () => ({ __esModule: true, default: { post: jest.fn() } }))
jest.mock('@/components/auth/AuthLayout', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))

function submitWith(errors: string[]) {
  ;(api.post as jest.Mock).mockRejectedValue({ response: { data: { errors } } })
  render(<MemoryRouter><SignupScreen /></MemoryRouter>)
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Pat' } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'pat@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pw' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
}

afterEach(() => jest.clearAllMocks())

test('each refusal shows under its field, which is marked invalid and described by it', async () => {
  submitWith(['Email has already been taken', 'Password is too short (minimum is 8 characters)'])
  await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2))
  expect(screen.getByLabelText('Email')).toBeInvalid()
  expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('Email has already been taken')
  expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Password is too short (minimum is 8 characters)')
  expect(screen.getByLabelText('Name')).not.toBeInvalid()
})

test('a refusal that is about no field shows above the form', async () => {
  submitWith(['Something went wrong'])
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong'))
  expect(screen.getByLabelText('Email')).not.toBeInvalid()
})
