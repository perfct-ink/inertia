import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Task, TaskField } from '@/types'
import { TaskFieldsCell } from './TaskFieldsCell'

const mockUpdate = { mutate: jest.fn(), isPending: false }
let mockFields: TaskField[] = []
let mockRole = 'member'
jest.mock('@/api/taskFields', () => ({ useTaskFields: () => ({ data: mockFields }) }))
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: { id: 1, name: 'Team', role: mockRole } }) }))
jest.mock('@/api/tasks', () => ({ useUpdateTask: () => mockUpdate }))

const task = { id: 7, title: 'Ship it', custom_fields: { 1: 3, 2: false } } as unknown as Task

beforeEach(() => {
  mockUpdate.mutate.mockReset()
  mockRole = 'member'
  mockFields = [
    { id: 1, name: 'Estimate', data_type: 'integer' },
    { id: 2, name: 'Reviewed', data_type: 'boolean' },
    { id: 3, name: 'Note', data_type: 'text' },
  ]
})

test('shows the values a task has as tags, including false and zero', () => {
  render(<TaskFieldsCell task={{ ...task, custom_fields: { 1: 0, 2: false } }} />)
  expect(screen.getByTitle('Estimate: 0')).toBeInTheDocument()
  expect(screen.getByTitle('Reviewed: No')).toBeInTheDocument()
  expect(screen.queryByTitle(/Note/)).not.toBeInTheDocument()
})

test('shows nothing for a task with no values and no fields to edit', () => {
  mockFields = []
  const { container } = render(<TaskFieldsCell task={{ ...task, custom_fields: {} }} />)
  expect(container).toBeEmptyDOMElement()
})

test('a viewer sees the values but cannot edit them', () => {
  mockRole = 'viewer'
  render(<TaskFieldsCell task={task} />)
  expect(screen.getByTitle('Estimate: 3')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Edit custom fields/ })).not.toBeInTheDocument()
})

test('editing sends only the values that changed, and clears an emptied one', () => {
  render(<TaskFieldsCell task={task} />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit custom fields of Ship it' }))
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

  expect(screen.getByLabelText(/Estimate/)).toHaveValue(3)
  fireEvent.change(screen.getByLabelText(/Estimate/), { target: { value: '5' } })
  fireEvent.change(screen.getByLabelText(/Reviewed/), { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 7, custom_fields: { 1: 5, 2: null } }, expect.anything())
})

test('a value that does not fit the field blocks saving and says why', () => {
  render(<TaskFieldsCell task={task} />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit custom fields of Ship it' }))
  fireEvent.change(screen.getByLabelText(/Estimate/), { target: { value: '2.5' } })
  expect(screen.getByRole('alert')).toHaveTextContent('Estimate must be a whole number')
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
})

test('a failed save keeps the dialog open and shows the server error', () => {
  mockUpdate.mutate.mockImplementation((_vars, options) => options.onError(new Error('boom')))
  render(<TaskFieldsCell task={task} />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit custom fields of Ship it' }))
  fireEvent.change(screen.getByLabelText(/Note/), { target: { value: 'hello' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to save. Please try again.')
  expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
})
