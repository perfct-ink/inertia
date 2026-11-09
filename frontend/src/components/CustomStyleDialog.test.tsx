import '@testing-library/jest-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
import CustomStyleDialog from './CustomStyleDialog'

const mockCreate = { mutate: jest.fn(), isPending: false }
const mockUpdate = { mutate: jest.fn(), isPending: false }
jest.mock('@/api/paragraphStyles', () => ({ useCreateParagraphStyle: () => mockCreate, useUpdateParagraphStyle: () => mockUpdate }))

const existing = [{ id: 1, name: 'Callout', base: 'quote' as const, properties: {} }]
const initial = { base: 'body' as const, properties: {} }

function renderDialog(props: Partial<Parameters<typeof CustomStyleDialog>[0]> = {}) {
  const onSaved = jest.fn()
  const onClose = jest.fn()
  render(<CustomStyleDialog open initial={initial} styles={existing} onSaved={onSaved} onClose={onClose} {...props} />)
  return { onSaved, onClose }
}

const name = () => screen.getByRole('textbox', { name: 'Name' })
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Create style' }))

beforeEach(() => { mockCreate.isPending = false; mockUpdate.isPending = false })
afterEach(() => jest.clearAllMocks())

test('opens empty, based on the paragraph it was opened from', () => {
  renderDialog({ initial: { base: 'quote', properties: { size: 20, color: '#2563eb', align: 'center' } } })
  expect(screen.getByRole('dialog', { name: 'New paragraph style' })).toBeInTheDocument()
  expect(name()).toHaveValue('')
  expect(screen.getByRole('combobox', { name: 'Based on' })).toHaveValue('quote')
  expect(screen.getByRole('combobox', { name: 'Size' })).toHaveValue('20')
  expect(screen.getByRole('combobox', { name: 'Alignment' })).toHaveValue('center')
  expect(screen.getByRole('button', { name: 'Blue' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Default' })).toHaveAttribute('aria-pressed', 'false')
})

test('saves the name, base and chosen formatting, leaving the rest to the base style', () => {
  renderDialog()
  fireEvent.change(name(), { target: { value: '  Big   note ' } })
  fireEvent.change(screen.getByRole('combobox', { name: 'Based on' }), { target: { value: 'caption' } })
  fireEvent.change(screen.getByRole('combobox', { name: 'Size' }), { target: { value: '24' } })
  fireEvent.change(screen.getByRole('combobox', { name: 'Weight' }), { target: { value: '700' } })
  fireEvent.change(screen.getByRole('combobox', { name: 'Line spacing' }), { target: { value: '1.5' } })
  fireEvent.click(screen.getByRole('button', { name: 'Red' }))
  save()
  expect(mockCreate.mutate).toHaveBeenCalledWith(
    { name: 'Big note', base: 'caption', properties: { size: 24, weight: 700, spacing: 1.5, color: '#dc2626' } },
    expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
  )
})

test('Default puts a property back to the base style\'s', () => {
  renderDialog({ initial: { base: 'body', properties: { size: 20, color: '#2563eb' } } })
  fireEvent.change(screen.getByRole('combobox', { name: 'Size' }), { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'Default' }))
  fireEvent.change(name(), { target: { value: 'Plain' } })
  save()
  expect(mockCreate.mutate.mock.calls[0][0].properties).toEqual({})
})

test('a blank, built-in or taken name is refused before asking the server', () => {
  renderDialog()
  save()
  expect(screen.getByRole('alert')).toHaveTextContent('Give the style a name.')

  fireEvent.change(name(), { target: { value: 'quote' } })
  save()
  expect(screen.getByRole('alert')).toHaveTextContent('already the name of a built-in style')

  fireEvent.change(name(), { target: { value: 'CALLOUT' } })
  save()
  expect(screen.getByRole('alert')).toHaveTextContent('You already have a style called CALLOUT.')
  expect(mockCreate.mutate).not.toHaveBeenCalled()
})

test('a saved style is handed back and the form is left to the caller to close', () => {
  const { onSaved, onClose } = renderDialog()
  fireEvent.change(name(), { target: { value: 'Note' } })
  save()
  const created = { id: 9, name: 'Note', base: 'body', properties: {} }
  mockCreate.mutate.mock.calls[0][1].onSuccess(created)
  expect(onSaved).toHaveBeenCalledWith(created)
  expect(onClose).not.toHaveBeenCalled()
})

test('a refusal from the server is shown beside the fields', () => {
  renderDialog()
  fireEvent.change(name(), { target: { value: 'Note' } })
  save()
  act(() => mockCreate.mutate.mock.calls[0][1].onError(new Error('boom')))
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to save. Please try again.')
})

test('saving disables the button and says so', () => {
  mockCreate.isPending = true
  renderDialog()
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
})

test('Cancel closes without saving', () => {
  const { onClose } = renderDialog()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onClose).toHaveBeenCalledTimes(1)
  expect(mockCreate.mutate).not.toHaveBeenCalled()
})

test('nothing renders while closed', () => {
  renderDialog({ open: false })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('reopening starts from a clean form', () => {
  const { rerender } = render(<CustomStyleDialog open initial={initial} styles={existing} onSaved={jest.fn()} onClose={jest.fn()} />)
  fireEvent.change(name(), { target: { value: 'Draft' } })
  rerender(<CustomStyleDialog open={false} initial={initial} styles={existing} onSaved={jest.fn()} onClose={jest.fn()} />)
  rerender(<CustomStyleDialog open initial={{ base: 'title', properties: {} }} styles={existing} onSaved={jest.fn()} onClose={jest.fn()} />)
  expect(name()).toHaveValue('')
  expect(screen.getByRole('combobox', { name: 'Based on' })).toHaveValue('title')
})

describe('editing a style', () => {
  const callout = { id: 1, name: 'Callout', base: 'quote' as const, properties: { size: 20, color: '#2563eb' } }
  const warning = { id: 2, name: 'Warning', base: 'caption' as const, properties: {} }
  const renderEditing = () => renderDialog({ editing: callout, styles: [callout, warning] })
  const saveEdit = () => fireEvent.click(screen.getByRole('button', { name: 'Save style' }))

  test('opens on the style with its own name, base and formatting', () => {
    renderEditing()
    expect(screen.getByRole('dialog', { name: 'Edit paragraph style' })).toBeInTheDocument()
    expect(name()).toHaveValue('Callout')
    expect(screen.getByRole('combobox', { name: 'Based on' })).toHaveValue('quote')
    expect(screen.getByRole('combobox', { name: 'Size' })).toHaveValue('20')
    expect(screen.getByRole('button', { name: 'Blue' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('saves the changes to that style rather than making a new one', () => {
    renderEditing()
    fireEvent.change(name(), { target: { value: 'Big callout' } })
    fireEvent.change(screen.getByRole('combobox', { name: 'Size' }), { target: { value: '28' } })
    saveEdit()
    expect(mockCreate.mutate).not.toHaveBeenCalled()
    expect(mockUpdate.mutate).toHaveBeenCalledWith(
      { id: 1, name: 'Big callout', base: 'quote', properties: { size: 28, color: '#2563eb' } },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    )
  })

  test('keeping its own name is fine, taking another style\'s name is not', () => {
    renderEditing()
    fireEvent.change(name(), { target: { value: 'callout' } })
    saveEdit()
    expect(mockUpdate.mutate).toHaveBeenCalledTimes(1)

    fireEvent.change(name(), { target: { value: 'warning' } })
    saveEdit()
    expect(screen.getByRole('alert')).toHaveTextContent('You already have a style called warning.')
    expect(mockUpdate.mutate).toHaveBeenCalledTimes(1)
  })

  test('a saved edit is handed back, and a refusal from the server is shown', () => {
    const { onSaved } = renderEditing()
    saveEdit()
    const saved = { ...callout, name: 'Renamed' }
    mockUpdate.mutate.mock.calls[0][1].onSuccess(saved)
    expect(onSaved).toHaveBeenCalledWith(saved)
    act(() => mockUpdate.mutate.mock.calls[0][1].onError(new Error('boom')))
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to save. Please try again.')
  })

  test('saving disables the button and says so', () => {
    mockUpdate.isPending = true
    renderEditing()
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  })
})
