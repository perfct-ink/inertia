import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Task, TaskField } from '@/types'
import { useAuthStore } from '@/store/auth'
import { TaskFieldsDialog } from './TaskFieldsDialog'

const mockSetValue = jest.fn()
const mockVote = jest.fn()
jest.mock('@/api/taskFields', () => ({
  useSetTaskFieldValue: () => ({ mutate: mockSetValue }),
  useVoteTaskField: () => ({ mutate: mockVote }),
}))

const fields: TaskField[] = [
  { id: 1, name: 'Priority', field_type: 'rating', options: [] },
  { id: 2, name: 'Votes', field_type: 'vote', options: [] },
  { id: 3, name: 'Reviewed', field_type: 'checkbox', options: [] },
]
const task = { id: 9, title: 'Ship it', field_values: { '2': [3] } } as unknown as Task

beforeEach(() => useAuthStore.setState({ token: 't', user: { id: 7, name: 'Ada', email: 'ada@example.com' } }))
afterEach(() => jest.clearAllMocks())

test('is closed without a task', () => {
  render(<TaskFieldsDialog task={null} fields={fields} onClose={jest.fn()} />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('lists every field of the task under its title', () => {
  render(<TaskFieldsDialog task={task} fields={fields} onClose={jest.fn()} />)
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(screen.getByText('Ship it')).toBeInTheDocument()
  for (const name of ['Priority', 'Votes', 'Reviewed']) expect(screen.getByText(name)).toBeInTheDocument()
  expect(screen.getByRole('group', { name: 'Priority' })).toBeInTheDocument()
})

test('saves a changed value for this task and field', () => {
  render(<TaskFieldsDialog task={task} fields={fields} onClose={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: '5 stars' }))
  expect(mockSetValue).toHaveBeenCalledWith({ taskId: 9, fieldId: 1, value: 5 })
  fireEvent.click(screen.getByRole('checkbox', { name: 'Reviewed' }))
  expect(mockSetValue).toHaveBeenLastCalledWith({ taskId: 9, fieldId: 3, value: true })
})

test('casts the signed-in user\'s vote', () => {
  render(<TaskFieldsDialog task={task} fields={fields} onClose={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Vote on Votes, 1 vote' }))
  expect(mockVote).toHaveBeenCalledWith({ taskId: 9, fieldId: 2, voted: true })
})

test('Done closes the dialog', () => {
  const onClose = jest.fn()
  render(<TaskFieldsDialog task={task} fields={fields} onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  expect(onClose).toHaveBeenCalled()
})
