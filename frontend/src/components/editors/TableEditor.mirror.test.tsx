import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import TableEditor from './TableEditor'
import type { Document } from '@/types'
import type { TableData } from '@/api/tables'

let mockData: TableData
let mockLinked: TableData | undefined
const mockEdit = jest.fn()
jest.mock('@/components/WorkspaceLayout', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
jest.mock('@/api/tables', () => ({
  ...jest.requireActual('@/api/tables'),
  useTable: () => ({ data: mockData, isLoading: false }),
  useEditTable: () => ({ mutateAsync: mockEdit, isPending: false }),
}))
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: { folders: [{ id: 1, documents: [{ id: 9, title: 'Companies', doc_type: 'table' }] }] } }) }))
jest.mock('@/api/workspaceMembers', () => ({ useWorkspaceMembers: () => ({ data: [] }) }))
jest.mock('@/api/documents', () => ({ useUpdateDocument: () => ({ mutateAsync: jest.fn() }) }))
jest.mock('@tanstack/react-query', () => ({ ...jest.requireActual('@tanstack/react-query'), useQueries: () => (mockLinked ? [{ data: mockLinked }] : [{ data: undefined }]) }))
const doc = { id: 1, title: 'Contacts', doc_type: 'table' } as Document

beforeEach(() => {
  mockEdit.mockReset().mockResolvedValue({})
  mockLinked = { fields: [{ id: 20, name: 'Name', data_type: 'text', relation_table_id: null }], records: [{ id: 5, values: { 20: 'Acme' } }] }
  mockData = {
    fields: [
      { id: 1, name: 'Company', data_type: 'relation', relation_table_id: 9 },
      { id: 3, name: 'Company name', data_type: 'mirror', relation_table_id: null, mirror_relation_field_id: 1, mirror_field_id: 20 },
    ],
    records: [{ id: 10, values: { 1: 5 }, mirrors: { 3: ['Acme'] } }, { id: 11, values: {}, mirrors: { 3: [] } }],
  }
})

test('a mirror column shows the linked record value as read-only text, a dash when nothing is linked', () => {
  render(<TableEditor doc={doc} />)
  const [linked, unlinked] = screen.getAllByRole('row').slice(1)
  expect(within(linked).getByRole('status', { name: 'Company name' })).toHaveTextContent('Acme')
  expect(within(unlinked).getByText('—')).toBeInTheDocument()
  expect(screen.queryByRole('textbox', { name: 'Company name' })).not.toBeInTheDocument()
  expect(screen.getByText(/Lookup → Companies · Name/)).toBeInTheDocument()
})

test('saving a record sends only the typed values, never the mirrored ones', async () => {
  render(<TableEditor doc={doc} />)
  const row = screen.getAllByRole('row')[1]
  fireEvent.change(within(row).getByLabelText('Company'), { target: { value: '' } })
  fireEvent.click(within(row).getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(mockEdit).toHaveBeenCalledWith({ path: 'records/10', method: 'patch', data: { record: { values: { 1: null } } } }))
})

test('adding a mirror field submits the connect field and the field to show', async () => {
  render(<TableEditor doc={doc} />)
  fireEvent.click(screen.getByRole('button', { name: 'Add field' }))
  fireEvent.change(screen.getByLabelText('Field name'), { target: { value: 'Company again' } })
  fireEvent.change(screen.getByLabelText('Data type'), { target: { value: 'mirror' } })
  const create = screen.getByRole('button', { name: 'Create field' })
  expect(create).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Connected through'), { target: { value: '1' } })
  fireEvent.change(screen.getByLabelText('Field to show'), { target: { value: '20' } })
  expect(create).toBeEnabled()
  fireEvent.click(create)
  await waitFor(() => expect(mockEdit).toHaveBeenCalledWith({ path: 'fields', method: 'post', data: { field: { name: 'Company again', data_type: 'mirror', relation_table_id: null, mirror_relation_field_id: 1, mirror_field_id: 20 } } }))
})

test('a rejected mirror field shows the server error and keeps the form open', async () => {
  mockEdit.mockRejectedValue(new Error('offline'))
  render(<TableEditor doc={doc} />)
  fireEvent.click(screen.getAllByRole('button', { name: /Company name/ })[0])
  fireEvent.click(screen.getByRole('button', { name: 'Save field' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Unable to save'))
  expect(screen.getByLabelText('Field name')).toHaveValue('Company name')
})
