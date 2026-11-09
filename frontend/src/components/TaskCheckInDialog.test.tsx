import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import TaskCheckInDialog from './TaskCheckInDialog'

const mockAdd = { mutate: jest.fn(), isPending: false }
let mockCheckIns: unknown[]
jest.mock('@/api/tasks', () => ({
  useTaskCheckIns: () => ({ data: mockCheckIns, isLoading: false }),
  useAddTaskCheckIn: () => mockAdd,
}))

const task = { id: 4, title: 'Roadmap', ongoing: true, check_in_recurrence: 'FREQ=WEEKLY' } as never

beforeEach(() => {
  mockCheckIns = [
    { id: 1, status: 'on_track', note: 'Kicked off', author_name: 'Pat', created_at: '2026-10-01T10:00:00Z' },
    { id: 2, status: 'blocked', note: null, author_name: null, created_at: '2026-10-08T10:00:00Z' },
  ]
})
afterEach(() => jest.clearAllMocks())

test('shows the log newest first with each status and note', () => {
  render(<TaskCheckInDialog task={task} onClose={jest.fn()} />)
  const items = screen.getAllByRole('listitem').map((li) => li.textContent)
  expect(items[0]).toContain('Blocked')
  expect(items[1]).toContain('On track')
  expect(items[1]).toContain('Kicked off')
  expect(screen.getByText('Asked to check in: weekly.')).toBeInTheDocument()
})

test('checks in with a status and a note, then clears the note and keeps the status', () => {
  mockAdd.mutate.mockImplementation((_checkIn, { onSuccess }) => onSuccess())
  render(<TaskCheckInDialog task={task} onClose={jest.fn()} />)
  expect(screen.getByLabelText('Status')).toHaveValue('on_track')
  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'at_risk' } })
  fireEvent.change(screen.getByLabelText('Note (optional)'), { target: { value: '  Waiting on the vendor ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Check in' }))
  expect(mockAdd.mutate).toHaveBeenCalledWith({ status: 'at_risk', note: 'Waiting on the vendor' }, expect.anything())
  expect(screen.getByLabelText('Note (optional)')).toHaveValue('')
  expect(screen.getByLabelText('Status')).toHaveValue('at_risk')
})

test('the note is optional: a status alone is a check-in', () => {
  render(<TaskCheckInDialog task={task} onClose={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Check in' }))
  expect(mockAdd.mutate).toHaveBeenCalledWith({ status: 'on_track', note: undefined }, expect.anything())
})

test('a failed check-in shows an error and keeps the note', () => {
  mockAdd.mutate.mockImplementation((_checkIn, { onError }) => onError(new Error('x')))
  render(<TaskCheckInDialog task={task} onClose={jest.fn()} />)
  fireEvent.change(screen.getByLabelText('Note (optional)'), { target: { value: 'Shipped' } })
  fireEvent.click(screen.getByRole('button', { name: 'Check in' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to save')
  expect(screen.getByLabelText('Note (optional)')).toHaveValue('Shipped')
})

test('the status starts at the latest one', () => {
  render(<TaskCheckInDialog task={{ ...(task as object), check_in_status: 'blocked' } as never} onClose={jest.fn()} />)
  expect(screen.getByLabelText('Status')).toHaveValue('blocked')
})

test('says when there are no check-ins yet', () => {
  mockCheckIns = []
  render(<TaskCheckInDialog task={task} onClose={jest.fn()} />)
  expect(screen.getByText('No check-ins yet.')).toBeInTheDocument()
})
