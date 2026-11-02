import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { TaskField } from '@/types'
import { ManageTaskFieldsDialog } from './ManageTaskFieldsDialog'

const mockCreate = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()
jest.mock('@/api/taskFields', () => ({
  useCreateTaskField: () => ({ mutate: mockCreate, isPending: false }),
  useUpdateTaskField: () => ({ mutate: mockUpdate, isPending: false }),
  useDeleteTaskField: () => ({ mutate: mockDelete, isPending: false }),
}))

const fields: TaskField[] = [
  { id: 1, name: 'Priority', field_type: 'rating', options: [] },
  { id: 2, name: 'Stage', field_type: 'dropdown', options: ['Draft', 'Final'] },
]

afterEach(() => jest.clearAllMocks())

function open(list: TaskField[] = fields) {
  render(<ManageTaskFieldsDialog open fields={list} onClose={jest.fn()} />)
}

test('lists the fields with their kind, and only offers Save once something changed', () => {
  open()
  expect(screen.getByLabelText('Name of Priority')).toHaveValue('Priority')
  expect(within(screen.getByLabelText('Name of Priority').closest('li')!).getByText('Rating')).toBeInTheDocument()
  expect(screen.getByLabelText('Choices for Stage')).toHaveValue('Draft\nFinal')
  expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('Name of Priority'), { target: { value: 'Urgency' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(mockUpdate).toHaveBeenCalledWith({ id: 1, name: 'Urgency' }, expect.anything())
})

test('changing a dropdown\'s choices warns about the values that go and saves the new list', () => {
  open()
  fireEvent.change(screen.getByLabelText('Choices for Stage'), { target: { value: 'Final\nShipped' } })
  expect(screen.getByText(/Tasks that use "Draft" will lose that value/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(mockUpdate).toHaveBeenCalledWith({ id: 2, name: 'Stage', options: ['Final', 'Shipped'] }, expect.anything())
})

test('a rename that repeats another field is refused before any request', () => {
  open()
  fireEvent.change(screen.getByLabelText('Name of Priority'), { target: { value: 'stage' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(screen.getByRole('alert')).toHaveTextContent('There is already a field called stage.')
  expect(mockUpdate).not.toHaveBeenCalled()
})

test('adds a field of the chosen kind', () => {
  open([])
  expect(screen.queryByRole('list')).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Field name'), { target: { value: ' Labels ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add field' }))
  expect(mockCreate).toHaveBeenCalledWith({ name: 'Labels', field_type: 'tags', options: [] }, expect.anything())
})

test('a dropdown is added with its choices, and needs at least one', () => {
  open([])
  fireEvent.change(screen.getByLabelText('Field name'), { target: { value: 'Stage' } })
  fireEvent.change(screen.getByLabelText('Field kind'), { target: { value: 'dropdown' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add field' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Add at least one choice.')
  expect(mockCreate).not.toHaveBeenCalled()

  fireEvent.change(screen.getByLabelText('Dropdown choices'), { target: { value: 'Draft, Final' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add field' }))
  expect(mockCreate).toHaveBeenCalledWith({ name: 'Stage', field_type: 'dropdown', options: ['Draft', 'Final'] }, expect.anything())
})

test('deleting a field asks first', () => {
  open()
  fireEvent.click(screen.getByRole('button', { name: 'Delete Priority' }))
  expect(mockDelete).not.toHaveBeenCalled()
  expect(screen.getByText('Its values on every task are deleted too.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Delete field' }))
  expect(mockDelete).toHaveBeenCalledWith(1)
})
