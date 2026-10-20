import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import DocumentEventDialog from './DocumentEventDialog'

test('collects a title, date and type, and needs a title', () => {
  const onSubmit = jest.fn()
  render(<DocumentEventDialog open onSubmit={onSubmit} onClose={jest.fn()} />)
  expect(screen.getByRole('button', { name: 'Add event' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Event title'), { target: { value: ' Beta launch ' } })
  fireEvent.change(screen.getByLabelText('Event date'), { target: { value: '2026-12-01' } })
  fireEvent.change(screen.getByLabelText('Event type'), { target: { value: 'deadline' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add event' }))
  expect(onSubmit).toHaveBeenCalledWith({ title: 'Beta launch', date: '2026-12-01', event_type: 'deadline' })
})
