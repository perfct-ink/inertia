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

const formulaFields: TableData['fields'] = [
  { id: 1, name: 'Price', data_type: 'number', relation_table_id: null },
  { id: 2, name: 'Quantity', data_type: 'integer', relation_table_id: null },
  { id: 3, name: 'Total', data_type: 'formula', relation_table_id: null, formula: '{Price} * {Quantity}' },
]

test('a formula field shows its result per record and recalculates as values are edited', () => {
  mockData = { fields: formulaFields, records: [{ id: 10, values: { 1: 2.5, 2: 4 } }] }
  render(<TableEditor doc={doc} />)
  const totals = screen.getAllByLabelText('Total')
  expect(totals[0]).toHaveTextContent('10')
  expect(totals[1]).toHaveTextContent('0')
  expect(screen.getByText('= {Price} * {Quantity}')).toBeInTheDocument()
  fireEvent.change(screen.getAllByLabelText('Quantity')[0], { target: { value: '6' } })
  expect(screen.getAllByLabelText('Total')[0]).toHaveTextContent('15')
})

test('a formula that cannot be worked out shows its error and why', () => {
  mockData = {
    fields: [formulaFields[0], { id: 4, name: 'Broken', data_type: 'formula', relation_table_id: null, formula: '{Gone} + 1' }],
    records: [{ id: 10, values: { 1: 2 } }],
  }
  render(<TableEditor doc={doc} />)
  expect(screen.getAllByLabelText('Broken')[0]).toHaveTextContent('#REF!')
  expect(screen.getAllByLabelText('Broken')[0]).toHaveTextContent('There is no field named {Gone}')
})

test('saving a record sends only the values typed into it, not formula results', async () => {
  mockData = { fields: [...formulaFields], records: [] }
  render(<TableEditor doc={doc} />)
  fireEvent.change(screen.getByLabelText('Price'), { target: { value: '2' } })
  fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '3' } })
  expect(screen.getByLabelText('Total')).toHaveTextContent('6')
  fireEvent.click(screen.getByRole('button', { name: 'Add record' }))
  await waitFor(() => expect(mockEdit).toHaveBeenCalledWith({ path: 'records', method: 'post', data: { record: { values: { 1: 2, 2: 3 } } } }))
})

test('adding a formula field submits its expression', async () => {
  render(<TableEditor doc={doc} />)
  fireEvent.click(screen.getByRole('button', { name: 'Add field' }))
  fireEvent.change(screen.getByLabelText('Field name'), { target: { value: 'Double' } })
  fireEvent.change(screen.getByLabelText('Data type'), { target: { value: 'formula' } })
  fireEvent.change(screen.getByLabelText('Insert field'), { target: { value: 'Age' } })
  expect(screen.getByLabelText('Formula')).toHaveValue('{Age}')
  fireEvent.change(screen.getByLabelText('Formula'), { target: { value: '{Age} * 2' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create field' }))
  await waitFor(() => expect(mockEdit).toHaveBeenCalledWith({
    path: 'fields', method: 'post', data: { field: { name: 'Double', data_type: 'formula', relation_table_id: null, formula: '{Age} * 2' } },
  }))
})

test('a formula with a problem is explained and not sent', () => {
  render(<TableEditor doc={doc} />)
  fireEvent.click(screen.getByRole('button', { name: 'Add field' }))
  fireEvent.change(screen.getByLabelText('Field name'), { target: { value: 'Double' } })
  fireEvent.change(screen.getByLabelText('Data type'), { target: { value: 'formula' } })
  fireEvent.change(screen.getByLabelText('Formula'), { target: { value: '{Nope} * 2' } })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  fireEvent.blur(screen.getByLabelText('Formula'))
  expect(screen.getByRole('alert')).toHaveTextContent('There is no field named {Nope}')
  fireEvent.click(screen.getByRole('button', { name: 'Create field' }))
  expect(mockEdit).not.toHaveBeenCalled()
})

test('editing a formula field starts from its saved expression and can change its type', async () => {
  mockData = { fields: formulaFields, records: [] }
  render(<TableEditor doc={doc} />)
  fireEvent.click(screen.getByRole('button', { name: 'Total' }))
  expect(screen.getByLabelText('Formula')).toHaveValue('{Price} * {Quantity}')
  fireEvent.change(screen.getByLabelText('Data type'), { target: { value: 'number' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save field' }))
  await waitFor(() => expect(mockEdit).toHaveBeenCalledWith({
    path: 'fields/3', method: 'patch', data: { field: { name: 'Total', data_type: 'number', relation_table_id: null } },
  }))
})
