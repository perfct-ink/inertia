import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ImportCollection from './ImportCollection'
import type { ImportPreview } from '@/api/collectionImport'

const mockNavigate = jest.fn()
const mockPreview = jest.fn()
const mockRun = jest.fn()
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))
jest.mock('@/api/collectionImport', () => ({
  usePreviewImport: () => ({ mutateAsync: mockPreview, isPending: false }),
  useRunImport: () => ({ mutateAsync: mockRun, isPending: false }),
}))

const guess: ImportPreview = {
  row_count: 2,
  columns: [
    { key: 'name', data_type: 'text', field_id: null, field_name: null, importable: true },
    { key: 'age', data_type: 'integer', field_id: null, field_name: null, importable: true },
    { key: 'note', data_type: 'text', field_id: null, field_name: null, importable: true },
  ],
  skipped_keys: ['tags'],
  types: ['text', 'integer', 'number'],
}

function paste(text = '[{"name":"Ada","age":36}]') {
  fireEvent.change(screen.getByLabelText('JSON or YAML'), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Check fields' }))
}

beforeEach(() => {
  mockPreview.mockReset().mockResolvedValue(guess)
  mockRun.mockReset().mockResolvedValue({ id: 9, row_count: 2 })
  mockNavigate.mockReset()
})

test('checks the guessed fields, lets a type change or a field be left out, and creates the collection', async () => {
  const onClose = jest.fn()
  render(<ImportCollection folderId={4} onClose={onClose} />)
  paste()
  expect(await screen.findByText(/2 records found/)).toBeInTheDocument()
  expect(screen.getByText(/nested objects or lists: tags/)).toBeInTheDocument()
  expect(mockPreview).toHaveBeenCalledWith({ text: '[{"name":"Ada","age":36}]', folder_id: 4 })

  fireEvent.change(screen.getByLabelText('Type of age'), { target: { value: 'number' } })
  fireEvent.change(screen.getByLabelText('Type of note'), { target: { value: 'skip' } })
  fireEvent.change(screen.getByLabelText('Collection name'), { target: { value: 'People' } })
  fireEvent.click(screen.getByRole('button', { name: 'Import' }))

  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/documents/9'))
  expect(mockRun).toHaveBeenCalledWith({
    text: '[{"name":"Ada","age":36}]', folder_id: 4, title: 'People',
    columns: [{ key: 'name', data_type: 'text' }, { key: 'age', data_type: 'number' }],
  })
  expect(onClose).toHaveBeenCalled()
})

test('appending shows which fields exist, has no name, stays on the page', async () => {
  mockPreview.mockResolvedValue({
    ...guess,
    columns: [
      { key: 'name', data_type: 'text', field_id: 1, field_name: 'Name', importable: true },
      { key: 'company', data_type: 'relation', field_id: 2, field_name: 'company', importable: false },
    ],
    skipped_keys: [],
  })
  const onClose = jest.fn()
  render(<ImportCollection documentId={7} onClose={onClose} />)
  paste()
  expect(await screen.findByText('Existing field “Name”')).toBeInTheDocument()
  expect(screen.getByText("Can't import into a relation field")).toBeInTheDocument()
  expect(screen.getByLabelText('Type of company')).toBeDisabled()
  expect(screen.queryByLabelText('Collection name')).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Import' }))
  await waitFor(() => expect(onClose).toHaveBeenCalled())
  expect(mockRun).toHaveBeenCalledWith({ text: '[{"name":"Ada","age":36}]', document_id: 7, columns: [{ key: 'name', data_type: 'text' }] })
  expect(mockNavigate).not.toHaveBeenCalled()
})

test('a file fills the text and editing the text asks for a new check', async () => {
  render(<ImportCollection folderId={4} onClose={jest.fn()} />)
  const file = Object.assign(new File(['x'], 'people.json'), { text: async () => '[{"name":"Bo"}]' })
  fireEvent.change(screen.getByLabelText('JSON or YAML file'), { target: { files: [file] } })
  await waitFor(() => expect(screen.getByLabelText('JSON or YAML')).toHaveValue('[{"name":"Bo"}]'))
  fireEvent.click(screen.getByRole('button', { name: 'Check fields' }))
  await screen.findByText(/2 records found/)
  fireEvent.change(screen.getByLabelText('JSON or YAML'), { target: { value: '[{"name":"Cy"}]' } })
  expect(screen.queryByText(/records found/)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Check fields' })).toBeInTheDocument()
})

test('a failed check or import shows the error in the dialog and imports nothing', async () => {
  mockPreview.mockRejectedValueOnce(new Error('offline'))
  render(<ImportCollection folderId={4} onClose={jest.fn()} />)
  paste()
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save')

  fireEvent.click(screen.getByRole('button', { name: 'Check fields' }))
  await screen.findByText(/2 records found/)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  mockRun.mockRejectedValueOnce(new Error('offline'))
  fireEvent.click(screen.getByRole('button', { name: 'Import' }))
  expect(await screen.findByRole('alert')).toBeInTheDocument()
  expect(mockNavigate).not.toHaveBeenCalled()
})

test('nothing can be imported while every field is left out', async () => {
  render(<ImportCollection folderId={4} onClose={jest.fn()} />)
  paste()
  await screen.findByText(/2 records found/)
  for (const key of ['name', 'age', 'note']) fireEvent.change(screen.getByLabelText(`Type of ${key}`), { target: { value: 'skip' } })
  expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled()
})
