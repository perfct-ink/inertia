import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import TableEditor from './TableEditor'
import type { Document } from '@/types'
import type { TableData } from '@/api/tables'

let mockData: TableData
const mockEdit = jest.fn()
jest.mock('@/components/WorkspaceLayout', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
jest.mock('@/api/tables', () => ({
  ...jest.requireActual('@/api/tables'),
  useTable: () => ({ data: mockData, isLoading: false }),
  useEditTable: () => ({ mutateAsync: mockEdit, isPending: false }),
}))
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: { folders: [] } }) }))
jest.mock('@/api/documents', () => ({ useUpdateDocument: () => ({ mutateAsync: jest.fn() }) }))
jest.mock('@tanstack/react-query', () => ({ ...jest.requireActual('@tanstack/react-query'), useQueries: () => [] }))
const doc = { id: 1, title: 'Contacts', doc_type: 'table' } as Document

beforeEach(() => {
  mockEdit.mockReset().mockResolvedValue({})
  mockData = {
    fields: [{ id: 1, name: 'Age', data_type: 'integer', relation_table_id: null }, { id: 2, name: 'Active', data_type: 'boolean', relation_table_id: null }],
    records: [],
  }
})

test('record inputs save numbers and booleans with their native types', async () => {
  render(<TableEditor doc={doc} />)
  fireEvent.change(screen.getByLabelText('Age'), { target: { value: '0' } })
  fireEvent.change(screen.getByLabelText('Active'), { target: { value: 'false' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add record' }))
  await waitFor(() => expect(mockEdit).toHaveBeenCalledWith({ path: 'records', method: 'post', data: { record: { values: { 1: 0, 2: false } } } }))
})

test('refreshing unchanged saved rows preserves unsaved edits', () => {
  mockData.records = [{ id: 10, values: { 1: 20 } }]
  const { rerender } = render(<TableEditor doc={doc} />)
  fireEvent.change(screen.getAllByLabelText('Age')[0], { target: { value: '21' } })
  mockData = { ...mockData, records: [{ id: 10, values: { 1: 20 } }] }
  rerender(<TableEditor doc={doc} />)
  expect(screen.getAllByLabelText('Age')[0]).toHaveValue(21)
})

test('adding a field submits the selected datatype', async () => {
  render(<TableEditor doc={doc} />)
  fireEvent.click(screen.getByRole('button', { name: 'Add field' }))
  fireEvent.change(screen.getByLabelText('Field name'), { target: { value: 'Birthday' } })
  fireEvent.change(screen.getByLabelText('Data type'), { target: { value: 'date' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create field' }))
  await waitFor(() => expect(mockEdit).toHaveBeenCalledWith({ path: 'fields', method: 'post', data: { field: { name: 'Birthday', data_type: 'date', relation_table_id: null } } }))
})

test('failed record saves display an error and retain the entered values', async () => {
  mockEdit.mockRejectedValue(new Error('offline'))
  render(<TableEditor doc={doc} />)
  fireEvent.change(screen.getByLabelText('Age'), { target: { value: '21' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add record' }))
  const row = screen.getByRole('button', { name: 'Add record' }).closest('tr')!
  await waitFor(() => expect(within(row).getByRole('alert')).toHaveTextContent('Unable to save'))
  expect(screen.getByLabelText('Age')).toHaveValue(21)
})

test('a number field can have a unit, which is saved and shown in its header', async () => {
  render(<TableEditor doc={doc} />)
  fireEvent.click(screen.getByRole('button', { name: 'Add field' }))
  fireEvent.change(screen.getByLabelText('Field name'), { target: { value: 'Weight' } })
  fireEvent.change(screen.getByLabelText('Data type'), { target: { value: 'number' } })
  fireEvent.change(screen.getByLabelText('Unit (optional)'), { target: { value: ' kg ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create field' }))
  await waitFor(() => expect(mockEdit).toHaveBeenCalledWith({ path: 'fields', method: 'post', data: { field: { name: 'Weight', data_type: 'number', relation_table_id: null, unit: 'kg' } } }))
})

test('number columns have a summary row with sum, average, min, max and count, in the field unit', () => {
  mockData = {
    fields: [{ id: 1, name: 'Weight', data_type: 'number', relation_table_id: null, unit: 'kg' }, { id: 2, name: 'Name', data_type: 'text', relation_table_id: null }],
    records: [{ id: 10, values: { 1: 3, 2: 'a' } }, { id: 11, values: { 1: 4.5, 2: 'b' } }, { id: 12, values: { 2: 'c' } }],
  }
  render(<TableEditor doc={doc} />)
  expect(screen.queryByLabelText('Summary of Name')).not.toBeInTheDocument()
  const summary = screen.getByLabelText('Summary of Weight')
  fireEvent.change(summary, { target: { value: 'sum' } })
  expect(screen.getByText('7.5 kg')).toBeInTheDocument()
  fireEvent.change(summary, { target: { value: 'count' } })
  expect(screen.getByText('2')).toBeInTheDocument()
  fireEvent.change(summary, { target: { value: 'none' } })
  expect(screen.queryByText('7.5 kg')).not.toBeInTheDocument()
})
