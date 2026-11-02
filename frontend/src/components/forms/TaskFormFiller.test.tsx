import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import type { FillableForm } from '@/types/taskForm'
import TaskFormFiller from './TaskFormFiller'

const form: FillableForm = {
  title: 'Report a bug',
  description: null,
  questions: [
    { id: 'summary', label: 'Summary', kind: 'short_text', target: 'title', required: true, options: [] },
    { id: 'what', label: 'What happened', kind: 'long_text', target: 'description', required: false, options: [] },
    { id: 'severity', label: 'Severity', kind: 'choice', target: 'details', required: false, options: ['High', 'Low'] },
    { id: 'needed', label: 'Needed by', kind: 'date', target: 'due_date', required: false, options: [] },
  ],
}

test('asks each question with the right control and sends the answers', () => {
  const onSubmit = jest.fn()
  render(<TaskFormFiller form={form} busy={false} error={null} onSubmit={onSubmit} />)

  fireEvent.change(screen.getByLabelText(/Summary/), { target: { value: 'Login broken' } })
  fireEvent.change(screen.getByLabelText('What happened'), { target: { value: 'It returns 500' } })
  fireEvent.change(screen.getByLabelText('Severity'), { target: { value: 'High' } })
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

  expect(onSubmit).toHaveBeenCalledWith({ summary: 'Login broken', what: 'It returns 500', severity: 'High', needed: '' }, '')
  expect(screen.getByLabelText('Severity').tagName).toBe('SELECT')
  expect(screen.getByLabelText('What happened').tagName).toBe('TEXTAREA')
})

test('a required question left blank is reported and nothing is sent', () => {
  const onSubmit = jest.fn()
  render(<TaskFormFiller form={form} busy={false} error={null} onSubmit={onSubmit} />)

  fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

  expect(onSubmit).not.toHaveBeenCalled()
  expect(screen.getByRole('alert')).toHaveTextContent('Summary is required')
  expect(screen.getByLabelText(/Summary/)).toHaveAttribute('aria-invalid', 'true')
})

test('shows the error from the server and disables the button while sending', () => {
  render(<TaskFormFiller form={form} busy error="Needed by must be a date" onSubmit={jest.fn()} />)
  expect(screen.getByRole('alert')).toHaveTextContent('Needed by must be a date')
  expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled()
})

test('the honeypot is only there when asked for, and its value is sent along', () => {
  const onSubmit = jest.fn()
  const { rerender } = render(<TaskFormFiller form={form} busy={false} error={null} onSubmit={onSubmit} />)
  expect(screen.queryByLabelText('Website')).not.toBeInTheDocument()

  rerender(<TaskFormFiller form={form} busy={false} error={null} honeypot onSubmit={onSubmit} />)
  fireEvent.change(screen.getByLabelText(/Summary/), { target: { value: 'x' } })
  fireEvent.change(screen.getByLabelText('Website', { selector: 'input' }), { target: { value: 'spam' } })
  fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ summary: 'x' }), 'spam')
})
