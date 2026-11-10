import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { AxiosError, type AxiosResponse } from 'axios'
import StyleShortcutsDialog from './StyleShortcutsDialog'

let mockShortcuts: { style: string; keys: string }[]
const mockSet = { mutate: jest.fn() }
const mockClear = { mutate: jest.fn() }
jest.mock('@/api/paragraphStyleShortcuts', () => ({
  useParagraphStyleShortcuts: () => ({ data: mockShortcuts }),
  useSetParagraphStyleShortcut: () => mockSet,
  useClearParagraphStyleShortcut: () => mockClear,
}))
jest.mock('@/api/paragraphStyles', () => ({ useParagraphStyles: () => ({ data: [{ id: 7, name: 'Callout', base: 'quote', properties: {} }] }) }))

const MAC = /Mac|iP(hone|[oa]d)/.test(navigator.platform)
const mod = MAC ? { metaKey: true } : { ctrlKey: true }

beforeEach(() => { mockShortcuts = [] })
afterEach(() => jest.clearAllMocks())

test('lists every built-in style and the person\'s own, with a default key where it has one', () => {
  render(<StyleShortcutsDialog open onClose={jest.fn()} />)
  expect(screen.getByRole('dialog', { name: 'Style shortcuts' })).toBeInTheDocument()
  expect(screen.getAllByRole('listitem')).toHaveLength(10)
  expect(screen.getByText('Callout')).toBeInTheDocument()
  expect(screen.getByText(MAC ? '⌘⌥7' : 'Ctrl+Alt+7')).toBeInTheDocument()
})

test('shows the keys the person set, and Remove clears them', () => {
  mockShortcuts = [{ style: 'custom-7', keys: 'Ctrl-Mod-1' }]
  render(<StyleShortcutsDialog open onClose={jest.fn()} />)
  expect(screen.getByText(MAC ? '⌃⌘1' : 'Ctrl+1')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Remove shortcut for Callout' }))
  expect(mockClear.mutate).toHaveBeenCalledWith('custom-7')
})

test('Set waits for a chord and saves it for that style', () => {
  render(<StyleShortcutsDialog open onClose={jest.fn()} />)
  const set = screen.getByRole('button', { name: 'Set shortcut for Callout' })
  fireEvent.click(set)
  expect(set).toHaveTextContent('Press keys…')
  fireEvent.keyDown(set, { key: '1', code: 'Digit1', ...mod, ctrlKey: true, metaKey: MAC })
  expect(mockSet.mutate).toHaveBeenCalledWith({ style: 'custom-7', keys: MAC ? 'Ctrl-Mod-1' : 'Mod-1' }, expect.any(Object))
  expect(set).toHaveTextContent('Set')
})

test('a key without ⌘ is not saved and says what to press', () => {
  render(<StyleShortcutsDialog open onClose={jest.fn()} />)
  const set = screen.getByRole('button', { name: 'Set shortcut for Callout' })
  fireEvent.click(set)
  fireEvent.keyDown(set, { key: 'q', code: 'KeyQ' })
  expect(mockSet.mutate).not.toHaveBeenCalled()
  expect(screen.getByRole('alert')).toHaveTextContent(/with a letter or digit/)
})

test('Escape stops recording without saving', () => {
  const onClose = jest.fn()
  render(<StyleShortcutsDialog open onClose={onClose} />)
  const set = screen.getByRole('button', { name: 'Set shortcut for Callout' })
  fireEvent.click(set)
  fireEvent.keyDown(set, { key: 'Escape', code: 'Escape' })
  expect(set).toHaveTextContent('Set')
  expect(mockSet.mutate).not.toHaveBeenCalled()
  expect(onClose).not.toHaveBeenCalled()
})

test('a refusal from the server is shown beside the row', () => {
  const response = { status: 422, data: { errors: ['Keys is already assigned to another style'] } } as AxiosResponse
  mockSet.mutate.mockImplementation((_vars, callbacks) => callbacks.onError(new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, response)))
  render(<StyleShortcutsDialog open onClose={jest.fn()} />)
  const set = screen.getByRole('button', { name: 'Set shortcut for Callout' })
  fireEvent.click(set)
  fireEvent.keyDown(set, { key: '1', code: 'Digit1', ctrlKey: true, metaKey: MAC })
  expect(screen.getByRole('alert')).toHaveTextContent('already assigned to another style')
})

test('a chord the editor already uses is saved, with a note that the person\'s choice wins', () => {
  mockSet.mutate.mockImplementation((_vars, callbacks) => callbacks.onSuccess())
  render(<StyleShortcutsDialog open onClose={jest.fn()} />)
  const set = screen.getByRole('button', { name: 'Set shortcut for Callout' })
  fireEvent.click(set)
  fireEvent.keyDown(set, { key: 'b', code: 'KeyB', ...mod })
  expect(mockSet.mutate).toHaveBeenCalled()
  expect(screen.getByRole('alert')).toHaveTextContent(/Bold.*your choice wins/)
})

test('Esc with nothing being recorded closes the dialog as usual', () => {
  const onClose = jest.fn()
  render(<StyleShortcutsDialog open onClose={onClose} />)
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' })
  expect(onClose).toHaveBeenCalled()
})
