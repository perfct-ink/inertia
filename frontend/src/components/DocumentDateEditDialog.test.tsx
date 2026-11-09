import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import DocumentDateEditDialog from './DocumentDateEditDialog'
import type { DocumentDate } from '@/types'

const linked = { id: 3, date: '2026-12-01', label: 'Ship the beta', document_id: 9, document_title: 'Launch plan' } as DocumentDate
const props = { pending: false, onSave: jest.fn(), onDelete: jest.fn(), onClose: jest.fn() }

afterEach(() => jest.clearAllMocks())

test('stays closed without an entry', () => {
  render(<DocumentDateEditDialog {...props} entry={null} />)
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('shows the entry and says where it was made', () => {
  render(<DocumentDateEditDialog {...props} entry={linked} />)
  expect(screen.getByLabelText('Date')).toHaveValue('2026-12-01')
  expect(screen.getByLabelText('Label')).toHaveValue('Ship the beta')
  expect(screen.getByText(/Made in “Launch plan”/)).toBeInTheDocument()
})

test('says so when the entry was kept after its line was deleted', () => {
  render(<DocumentDateEditDialog {...props} entry={{ ...linked, document_id: null, document_title: null }} />)
  expect(screen.getByText('Not linked to a document any more.')).toBeInTheDocument()
})

test('saves the new day and a trimmed label, and needs a day', () => {
  render(<DocumentDateEditDialog {...props} entry={linked} />)
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '' } })
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-12-15' } })
  fireEvent.change(screen.getByLabelText('Label'), { target: { value: ' Public beta ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(props.onSave).toHaveBeenCalledWith({ date: '2026-12-15', label: 'Public beta' })
})

test('deletes or cancels', () => {
  render(<DocumentDateEditDialog {...props} entry={linked} />)
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
  expect(props.onDelete).toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(props.onClose).toHaveBeenCalled()
})

test('cannot be saved twice while saving', () => {
  render(<DocumentDateEditDialog {...props} entry={linked} pending />)
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
})
