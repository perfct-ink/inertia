import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import ImportCollection from './ImportCollection'

const mockNavigate = jest.fn()
const mockPreview = { mutate: jest.fn(), isPending: false }
const mockImport = { mutate: jest.fn(), isPending: false }
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))
jest.mock('@/api/collectionImport', () => ({
  usePreviewImport: () => mockPreview,
  useImportCollection: () => mockImport,
}))

afterEach(() => jest.clearAllMocks())

test('checks the guessed fields, lets a type change, and imports', () => {
  mockPreview.mutate.mockImplementation((_text, { onSuccess }) =>
    onSuccess({ fields: [{ name: 'name', data_type: 'text' }, { name: 'age', data_type: 'integer' }], row_count: 2, skipped_keys: ['tags'] }))
  mockImport.mutate.mockImplementation((_data, { onSuccess }) => onSuccess({ id: 9, row_count: 2 }))
  const onClose = jest.fn()
  render(<ImportCollection open folderId={4} onClose={onClose} />)

  fireEvent.change(screen.getByLabelText('JSON or YAML'), { target: { value: '[{"name":"Ada","age":36}]' } })
  fireEvent.click(screen.getByRole('button', { name: 'Check fields' }))
  expect(screen.getByText(/2 records/)).toBeInTheDocument()
  expect(screen.getByText(/Skipped nested keys: tags/)).toBeInTheDocument()

  fireEvent.change(screen.getByLabelText('Type of age'), { target: { value: 'number' } })
  fireEvent.click(screen.getByRole('button', { name: 'Import' }))
  expect(mockImport.mutate).toHaveBeenCalledWith(
    expect.objectContaining({ folderId: 4, fields: [{ name: 'name', data_type: 'text' }, { name: 'age', data_type: 'number' }] }),
    expect.anything(),
  )
  expect(mockNavigate).toHaveBeenCalledWith('/documents/9')
  expect(onClose).toHaveBeenCalled()
})
