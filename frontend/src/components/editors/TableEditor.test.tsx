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
const mockRelations = new Map<number, TableData>()
jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useQueries: ({ queries }: { queries: { queryKey: unknown[] }[] }) => queries.map(q => ({ data: mockRelations.get(q.queryKey[1] as number) })),
}))
const doc = { id: 1, title: 'Contacts', doc_type: 'table' } as Document

beforeEach(() => {
  mockRelations.clear()
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
  await waitFor(() => expect(mockEdit).toHaveBeenCalledWith({ path: 'fields', method: 'post', data: { field: { name: 'Birthday', data_type: 'date', relation_table_id: null, allow_many: false } } }))
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

test('a many relation picks several records and saves their ids', async () => {
  mockData = { fields: [{ id: 3, name: 'Songs', data_type: 'relation', relation_table_id: 9, allow_many: true }], records: [] }
  mockRelations.set(9, { fields: [{ id: 1, name: 'Name', data_type: 'text', relation_table_id: null }], records: [{ id: 4, values: { 1: 'Intro' } }, { id: 5, values: { 1: 'Outro' } }] })
  render(<TableEditor doc={doc} />)
  const select = screen.getByLabelText('Songs') as HTMLSelectElement
  expect(select.multiple).toBe(true)
  Array.from(select.options).forEach(o => { o.selected = true })
  fireEvent.change(select)
  fireEvent.click(screen.getByRole('button', { name: 'Add record' }))
  await waitFor(() => expect(mockEdit).toHaveBeenCalledWith({ path: 'records', method: 'post', data: { record: { values: { 3: [4, 5] } } } }))
})

test('records that link here are listed in a read-only column', () => {
  mockData = {
    fields: [{ id: 1, name: 'Title', data_type: 'text', relation_table_id: null }],
    reverse_fields: [{ id: 7, name: 'Songs', source_table_id: 2 }],
    records: [{ id: 10, values: {}, reverse: { 7: [{ id: 21, label: 'Intro' }, { id: 22, label: '#22' }] } }],
  }
  render(<TableEditor doc={doc} />)
  expect(screen.getByText('Songs')).toBeInTheDocument()
  expect(screen.getByText('Intro')).toBeInTheDocument()
  expect(screen.getByText('#22')).toBeInTheDocument()
})
