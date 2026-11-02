import '@testing-library/jest-dom'
import { render, screen, within } from '@testing-library/react'
import { ActivityDialog } from './ActivityDialog'

let mockResult: { data?: unknown[]; isLoading: boolean; isError: boolean }
const mockUseActivities = jest.fn()
jest.mock('@/api/activities', () => ({
  useActivities: (...args: unknown[]) => { mockUseActivities(...args); return mockResult },
}))

function renderDialog(onClose = jest.fn()) {
  render(<ActivityDialog subjectType="Task" subjectId={4} title="Ship" onClose={onClose} />)
  return onClose
}

beforeEach(() => {
  mockUseActivities.mockClear()
  mockResult = { data: [], isLoading: false, isError: false }
})

test('loads the log of the item it was opened for', () => {
  renderDialog()
  expect(mockUseActivities).toHaveBeenCalledWith('Task', 4)
  expect(screen.getAllByText('Activity: Ship').length).toBeGreaterThan(0)
})

test('lists each entry with who did it and what changed, newest first', () => {
  mockResult.data = [
    { id: 2, action: 'updated', actor_name: 'Pat', created_at: '2026-11-02T10:00:00', changes: { status: ['todo', 'done'], description: null } },
    { id: 1, action: 'created', actor_name: null, created_at: '2026-11-01T09:00:00', changes: {} },
  ]
  renderDialog()

  const entries = within(screen.getByRole('list', { name: 'Activity, newest first' })).getAllByRole('listitem')
  const [newest, oldest] = entries.filter((item) => item.className.includes('activity_log-entry'))
  expect(within(newest).getByText('Pat')).toBeInTheDocument()
  expect(within(newest).getByText('Changed status from To Do to Done')).toBeInTheDocument()
  expect(within(newest).getByText('Edited the description')).toBeInTheDocument()
  expect(within(oldest).getByText('Someone')).toBeInTheDocument()
  expect(within(oldest).getByText('Created this task')).toBeInTheDocument()
})

test('says so when nothing has been recorded', () => {
  renderDialog()
  expect(screen.getByText(/No activity recorded yet/)).toBeInTheDocument()
  expect(screen.queryByRole('list', { name: 'Activity, newest first' })).not.toBeInTheDocument()
})

test('shows an error when the log could not be loaded', () => {
  mockResult = { data: undefined, isLoading: false, isError: true }
  renderDialog()
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to load the activity')
  expect(screen.queryByText(/No activity recorded yet/)).not.toBeInTheDocument()
})

test('notes when the log was cut off at the page size', () => {
  mockResult.data = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, action: 'created', actor_name: 'Pat', created_at: '2026-11-01T09:00:00', changes: {} }))
  renderDialog()
  expect(screen.getByText('Showing the latest 100 entries.')).toBeInTheDocument()
})

test('the close button closes it', () => {
  const onClose = renderDialog()
  screen.getByRole('button', { name: 'Close' }).click()
  expect(onClose).toHaveBeenCalledTimes(1)
})
