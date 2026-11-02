import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CollectionCsv from './CollectionCsv'
import { downloadCsv } from '@/util/download'
import type { TableData } from '@/api/tables'

const mockEdit = jest.fn()
jest.mock('@/api/tables', () => ({ useEditTable: () => ({ mutateAsync: mockEdit, isPending: false }) }))
jest.mock('@/util/errorMessage', () => ({ errorMessage: (e: Error) => e.message }))
jest.mock('@/util/download', () => ({ ...jest.requireActual('@/util/download'), downloadCsv: jest.fn() }))

const data: TableData = {
  fields: [
    { id: 1, name: 'Name', data_type: 'text', relation_table_id: null },
    { id: 2, name: 'Age', data_type: 'integer', relation_table_id: null },
  ],
  records: [{ id: 10, values: { 1: 'Ada', 2: 36 } }],
}

beforeEach(() => {
  mockEdit.mockReset().mockResolvedValue({})
  ;(downloadCsv as jest.Mock).mockReset()
})

async function chooseFile(text: string, name = 'people.csv') {
  fireEvent.click(screen.getByRole('button', { name: 'Import CSV' }))
  fireEvent.change(screen.getByLabelText('CSV file'), { target: { files: [new File([text], name, { type: 'text/csv' })] } })
  await screen.findByText(/Choose where each column goes/)
}

test('export downloads the collection as CSV rows named after its title', () => {
  render(<CollectionCsv docId={1} title="Contacts" data={data} />)
  fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }))
  expect(downloadCsv).toHaveBeenCalledWith('Contacts', [['Record ID', 'Name', 'Age'], [10, 'Ada', 36]], 'collection')
})

test('export is unavailable until the collection has fields', () => {
  render(<CollectionCsv docId={1} title="Contacts" data={{ fields: [], records: [] }} />)
  expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled()
})

test('import maps columns to fields, creates new ones and sends the converted values', async () => {
  render(<CollectionCsv docId={1} title="Contacts" data={data} />)
  await chooseFile('Name,Age,City\nAda,36,Paris\n')
  expect(screen.getByText('people.csv')).toBeInTheDocument()
  expect(screen.getByLabelText('Import Name as')).toHaveValue('field:1')
  expect(screen.getByLabelText('Import Age as')).toHaveValue('field:2')
  expect(screen.getByLabelText('Import City as')).toHaveValue('new:text')
  expect(screen.getByText(/1 record will be added/)).toHaveTextContent('New field: City.')

  fireEvent.click(screen.getByRole('button', { name: 'Import 1 record' }))
  await waitFor(() => expect(mockEdit).toHaveBeenCalledWith({
    path: 'import',
    method: 'post',
    data: { columns: [{ field_id: 1 }, { field_id: 2 }, { name: 'City', data_type: 'text' }], rows: [['Ada', 36, 'Paris']] },
  }))
  await waitFor(() => expect(screen.queryByText(/Choose where each column goes/)).not.toBeInTheDocument())
  expect(screen.getByRole('status')).toHaveTextContent('Imported 1 record.')
})

test('a semicolon-separated file works and a column can be skipped or retyped', async () => {
  render(<CollectionCsv docId={1} title="Contacts" data={data} />)
  await chooseFile('Name;Notes;Founded\nAda;hello;2020-01-02\n')
  expect(screen.getByLabelText('Import Founded as')).toHaveValue('new:date')
  fireEvent.change(screen.getByLabelText('Import Notes as'), { target: { value: 'skip' } })
  fireEvent.change(screen.getByLabelText('Import Founded as'), { target: { value: 'new:text' } })
  fireEvent.click(screen.getByRole('button', { name: 'Import 1 record' }))
  await waitFor(() => expect(mockEdit).toHaveBeenCalledWith(expect.objectContaining({
    data: { columns: [{ field_id: 1 }, { name: 'Founded', data_type: 'text' }], rows: [['Ada', '2020-01-02']] },
  })))
})

test('bad values are listed with their row and block the import', async () => {
  render(<CollectionCsv docId={1} title="Contacts" data={data} />)
  await chooseFile('Name,Age\nAda,36\nBo,old\n')
  expect(screen.getByRole('alert')).toHaveTextContent('Row 3, “Age”: “old” is not a whole number')
  expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Import Age as'), { target: { value: 'skip' } })
  expect(screen.getByRole('button', { name: 'Import 2 records' })).toBeEnabled()
})

test('a failed import shows the error and keeps the dialog open', async () => {
  mockEdit.mockRejectedValue(new Error('Row 2, Age: Value must match the integer type'))
  render(<CollectionCsv docId={1} title="Contacts" data={data} />)
  await chooseFile('Name,Age\nAda,36\n')
  fireEvent.click(screen.getByRole('button', { name: 'Import 1 record' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Row 2, Age: Value must match')
  expect(screen.getByRole('button', { name: 'Import 1 record' })).toBeEnabled()
})

test('an unreadable file shows why', async () => {
  render(<CollectionCsv docId={1} title="Contacts" data={data} />)
  fireEvent.click(screen.getByRole('button', { name: 'Import CSV' }))
  fireEvent.change(screen.getByLabelText('CSV file'), { target: { files: [new File(['a,b\n"oops,1'], 'bad.csv')] } })
  expect(await screen.findByRole('alert')).toHaveTextContent('quoted cell that starts on line 2')
  expect(screen.queryByText(/Choose where each column goes/)).not.toBeInTheDocument()
})

test('cancel closes the dialog without sending anything', async () => {
  render(<CollectionCsv docId={1} title="Contacts" data={data} />)
  await chooseFile('Name\nAda\n')
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByText(/Choose where each column goes/)).not.toBeInTheDocument()
  expect(mockEdit).not.toHaveBeenCalled()
})
