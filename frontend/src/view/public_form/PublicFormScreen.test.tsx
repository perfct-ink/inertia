import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import PublicFormScreen from './PublicFormScreen'

jest.mock('react-router-dom', () => ({ useParams: () => ({ token: 'abc123' }) }), { virtual: true })

const form = {
  title: 'Request a feature',
  description: 'Tell us what you need',
  questions: [{ id: 'title', label: 'Title', kind: 'short_text', target: 'title', required: true, options: [] }],
}

let mockForm: { data?: typeof form; isLoading: boolean; isError: boolean }
let mockSubmit: { mutate: jest.Mock; reset: jest.Mock; isPending: boolean; isSuccess: boolean; isError: boolean; error: unknown }
jest.mock('@/api/taskForms', () => ({
  usePublicTaskForm: () => mockForm,
  useSubmitPublicTaskForm: () => mockSubmit,
}))
jest.mock('@/util/errorMessage', () => ({ errorMessage: (e: { message: string }) => e.message }))

beforeEach(() => {
  mockForm = { data: form, isLoading: false, isError: false }
  mockSubmit = { mutate: jest.fn(), reset: jest.fn(), isPending: false, isSuccess: false, isError: false, error: null }
})

test('shows the form and sends the answers with the honeypot value', () => {
  render(<PublicFormScreen />)
  expect(screen.getByRole('heading', { name: 'Request a feature' })).toBeInTheDocument()
  expect(screen.getByText('Tell us what you need')).toBeInTheDocument()

  fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Dark mode' } })
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
  expect(mockSubmit.mutate).toHaveBeenCalledWith({ answers: { title: 'Dark mode' }, website: '' })
  expect(document.title).toContain('Request a feature')
})

test('thanks the person once it is sent, and lets them send another', () => {
  mockSubmit.isSuccess = true
  render(<PublicFormScreen />)
  expect(screen.getByRole('status')).toHaveTextContent('Thanks, your response was sent')
  fireEvent.click(screen.getByRole('button', { name: 'Send another response' }))
  expect(mockSubmit.reset).toHaveBeenCalled()
})

test('a link that does not work says so instead of showing a form', () => {
  mockForm = { data: undefined, isLoading: false, isError: true }
  render(<PublicFormScreen />)
  expect(screen.getByRole('alert')).toHaveTextContent('This form isn’t available')
  expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument()
})

test('a failed send shows the reason on the form', () => {
  mockSubmit.isError = true
  mockSubmit.error = new Error('Too many responses just now. Please try again later.')
  render(<PublicFormScreen />)
  expect(screen.getByRole('alert')).toHaveTextContent('Too many responses just now')
})
