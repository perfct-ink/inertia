import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import TaskCheckInDialog from './TaskCheckInDialog'

const mockCreate = { mutate: jest.fn(), isPending: false }
jest.mock('@/api/tasks', () => ({
  useTaskCheckIns: () => ({ data: [
    { id: 1, body: 'Kicked off', author_name: 'Pat', created_at: '2026-10-01T10:00:00Z' },
    { id: 2, body: 'Going well', author_name: null, created_at: '2026-10-08T10:00:00Z' },
  ] }),
  useCreateTaskCheckIn: () => mockCreate,
}))

test('shows the log newest first and adds an update', () => {
  mockCreate.mutate.mockImplementation((_body, { onSuccess }) => onSuccess())
  render(<TaskCheckInDialog task={{ id: 4, title: 'Roadmap', check_in_every_days: 7 } as never} onClose={jest.fn()} />)
  const items = screen.getAllByRole('listitem').map((li) => li.textContent)
  expect(items[0]).toContain('Going well')
  expect(items[1]).toContain('Kicked off')
  expect(screen.getByText('Checked in every 7 days.')).toBeInTheDocument()

  expect(screen.getByRole('button', { name: 'Add update' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Your update'), { target: { value: '  Shipped the draft ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add update' }))
  expect(mockCreate.mutate).toHaveBeenCalledWith('Shipped the draft', expect.anything())
  expect(screen.getByLabelText('Your update')).toHaveValue('')
})
