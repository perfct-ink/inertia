import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import CustomStylesDialog from './CustomStylesDialog'

const mockDelete = { mutate: jest.fn() }
jest.mock('@/api/paragraphStyles', () => ({ useDeleteParagraphStyle: () => mockDelete }))

const callout = { id: 1, name: 'Callout', base: 'quote' as const, properties: { size: 20 } }
const warning = { id: 2, name: 'Warning', base: 'caption' as const, properties: {} }

function renderDialog(props: Partial<Parameters<typeof CustomStylesDialog>[0]> = {}) {
  const onEdit = jest.fn()
  const onClose = jest.fn()
  render(<CustomStylesDialog open styles={[callout, warning]} onEdit={onEdit} onClose={onClose} {...props} />)
  return { onEdit, onClose }
}

afterEach(() => jest.clearAllMocks())

test('lists each style with the built-in style it is based on', () => {
  renderDialog()
  expect(screen.getByRole('dialog', { name: 'My paragraph styles' })).toBeInTheDocument()
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  expect(screen.getByText('Callout')).toBeInTheDocument()
  expect(screen.getByText('Based on Quote')).toBeInTheDocument()
  expect(screen.getByText('Based on Caption')).toBeInTheDocument()
})

test('Edit hands that style back to be changed', () => {
  const { onEdit } = renderDialog()
  fireEvent.click(screen.getByRole('button', { name: 'Edit Warning' }))
  expect(onEdit).toHaveBeenCalledWith(warning)
})

test('Delete asks first, and only deletes once confirmed', () => {
  renderDialog()
  fireEvent.click(screen.getByRole('button', { name: 'Delete Callout' }))
  expect(screen.getByText('Delete Callout?')).toBeInTheDocument()
  expect(screen.getByText(/turn into Body/)).toBeInTheDocument()
  expect(mockDelete.mutate).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: 'Delete style' }))
  expect(mockDelete.mutate).toHaveBeenCalledWith(1)
})

test('cancelling the confirmation deletes nothing', () => {
  renderDialog()
  fireEvent.click(screen.getByRole('button', { name: 'Delete Callout' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(mockDelete.mutate).not.toHaveBeenCalled()
  expect(screen.queryByText('Delete Callout?')).not.toBeInTheDocument()
})

test('with no styles it says so instead of showing an empty list', () => {
  renderDialog({ styles: [] })
  expect(screen.getByText('You have no styles of your own.')).toBeInTheDocument()
  expect(screen.queryByRole('list')).not.toBeInTheDocument()
})

test('Close closes it', () => {
  const { onClose } = renderDialog()
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('nothing renders while closed', () => {
  renderDialog({ open: false })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
