import { renderHook } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import TiptapDocument from '@tiptap/extension-document'
import Heading from '@tiptap/extension-heading'
import Text from '@tiptap/extension-text'
import { ParagraphStyleUserShortcuts } from '@/extensions/ParagraphStyleUserShortcuts'
import { StyledParagraph } from '@/extensions/StyledParagraph'
import { useAuthStore } from '@/store/auth'
import { useUserStyleShortcuts } from './useUserStyleShortcuts'

let mockShortcuts: { style: string; keys: string }[]
let mockStyles: unknown[]
jest.mock('@/api/paragraphStyleShortcuts', () => ({ useParagraphStyleShortcuts: () => ({ data: mockShortcuts }) }))
jest.mock('@/api/paragraphStyles', () => ({ useParagraphStyles: () => ({ data: mockStyles }) }))

const callout = { id: 7, name: 'Callout', base: 'quote', properties: { size: 20 } }

let editor: Editor
beforeEach(() => {
  mockShortcuts = [{ style: 'quote', keys: 'Mod-Alt-q' }, { style: 'custom-7', keys: 'Mod-Alt-c' }, { style: 'custom-9', keys: 'Mod-Alt-d' }]
  mockStyles = [callout]
  useAuthStore.setState({ user: { id: 3 } as never })
  editor = new Editor({ extensions: [TiptapDocument, StyledParagraph, Heading, Text, ParagraphStyleUserShortcuts], content: '<p>one</p>' })
  editor.commands.focus('end')
})
afterEach(() => editor.destroy())

const MAC = /Mac|iP(hone|[oa]d)/.test(navigator.platform)
function press(letter: string): boolean {
  const mod = MAC ? { metaKey: true } : { ctrlKey: true }
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: letter, code: `Key${letter.toUpperCase()}`, keyCode: letter.toUpperCase().charCodeAt(0), altKey: true, ...mod })
  const handled = Boolean(editor.view.someProp('handleKeyDown', (handle) => handle(editor.view, event)))
  return handled && event.defaultPrevented
}

test('a built-in style\'s chord gives the block that style', () => {
  renderHook(() => useUserStyleShortcuts(editor))
  expect(press('q')).toBe(true)
  expect(editor.view.dom.querySelector('p')?.getAttribute('data-style')).toBe('quote')
})

test('a custom style\'s chord gives the block that style, with its copy', () => {
  renderHook(() => useUserStyleShortcuts(editor))
  expect(press('c')).toBe(true)
  expect(editor.view.dom.querySelector('p')?.getAttribute('data-style')).toBe('custom-7')
  expect(editor.view.dom.querySelector('p')?.getAttribute('data-style-name')).toBe('Callout')
})

test('a chord whose custom style is gone, and a chord nobody assigned, do nothing', () => {
  renderHook(() => useUserStyleShortcuts(editor))
  expect(press('d')).toBe(false)
  expect(press('z')).toBe(false)
  expect(editor.getHTML()).toBe('<p>one</p>')
})

test('leaving the document takes the keystrokes away', () => {
  const { unmount } = renderHook(() => useUserStyleShortcuts(editor))
  unmount()
  expect(press('q')).toBe(false)
})
