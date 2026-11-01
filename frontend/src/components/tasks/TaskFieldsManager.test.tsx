import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { TaskField } from '@/types'
import { TaskFieldsManager } from './TaskFieldsManager'

const mockCreate = { mutate: jest.fn(), isPending: false }
const mockRename = { mutate: jest.fn(), isPending: false }
const mockDelete = { mutate: jest.fn(), isPending: false }
let mockFields: TaskField[] = []
jest.mock('@/api/taskFields', () => ({
  useTaskFields: () => ({ data: mockFields }),
  useCreateTaskField: () => mockCreate,
  useUpdateTaskField: () => mockRename,
  useDeleteTaskField: () => mockDelete,
}))

const onClose = jest.fn()

beforeEach(() => {
  [mockCreate, mockRename, mockDelete].forEach((m) => m.mutate.mockReset())
  mockFields = [{ id: 1, name: 'Estimate', data_type: 'integer' }, { id: 2, name: 'Reviewed', data_type: 'boolean' }]
})

test('lists the fields with their types', () => {
  render(<TaskFieldsManager open onClose={onClose} />)
  // The type picker below also lists the type names, so look inside the list.
  const list = within(screen.getByRole('list'))
  expect(list.getByText('Estimate')).toBeInTheDocument()
  expect(list.getByText('Whole number')).toBeInTheDocument()
  expect(list.getByText('Yes / no')).toBeInTheDocument()
})

test('says so when there are no fields yet', () => {
  mockFields = []
  render(<TaskFieldsManager open onClose={onClose} />)
  expect(screen.getByText(/No custom fields yet/)).toBeInTheDocument()
})

test('adds a field with the chosen name and type', () => {
  render(<TaskFieldsManager open onClose={onClose} />)
  expect(screen.getByRole('button', { name: 'Add field' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Field name'), { target: { value: ' Story points ' } })
  fireEvent.change(screen.getByLabelText('Field type'), { target: { value: 'number' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add field' }))
  expect(mockCreate.mutate).toHaveBeenCalledWith({ name: 'Story points', data_type: 'number' }, expect.anything())
})

test('a name that is already taken cannot be added', () => {
  render(<TaskFieldsManager open onClose={onClose} />)
  fireEvent.change(screen.getByLabelText('Field name'), { target: { value: 'estimate' } })
  expect(screen.getByRole('alert')).toHaveTextContent('A field called “estimate” already exists.')
  expect(screen.getByRole('button', { name: 'Add field' })).toBeDisabled()
})

test('shows the server error when adding fails', () => {
  mockCreate.mutate.mockImplementation((_vars, options) => options.onError(new Error('boom')))
  render(<TaskFieldsManager open onClose={onClose} />)
  fireEvent.change(screen.getByLabelText('Field name'), { target: { value: 'Priority' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add field' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to save. Please try again.')
})

test('deleting a field asks first because its values go with it', () => {
  render(<TaskFieldsManager open onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: 'Delete Estimate' }))
  expect(screen.getByText(/and its values on every task/)).toBeInTheDocument()
  expect(mockDelete.mutate).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
  expect(mockDelete.mutate).toHaveBeenCalledWith(1, expect.anything())
})

test('renaming sends the new name', () => {
  render(<TaskFieldsManager open onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: 'Rename Estimate' }))
  const input = screen.getByDisplayValue('Estimate')
  fireEvent.change(input, { target: { value: 'Points' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(mockRename.mutate).toHaveBeenCalledWith({ id: 1, name: 'Points' }, expect.anything())
})
