import { Editor } from '@tiptap/core'
import TiptapDocument from '@tiptap/extension-document'
import Bold from '@tiptap/extension-bold'
import Text from '@tiptap/extension-text'
import { ParagraphStyleUserShortcuts, setStyleChordHandler } from './ParagraphStyleUserShortcuts'
import { StyledParagraph } from './StyledParagraph'

let editor: Editor
beforeEach(() => {
  editor = new Editor({ extensions: [TiptapDocument, StyledParagraph, Text, Bold, ParagraphStyleUserShortcuts], content: '<p>one</p>' })
  editor.commands.selectAll()
})
afterEach(() => editor.destroy())

const MAC = /Mac|iP(hone|[oa]d)/.test(navigator.platform)
const MOD = MAC ? { metaKey: true } : { ctrlKey: true }

// Sends a keydown through the editor's key handlers; true if one took it.
function press(init: KeyboardEventInit & { keyCode: number }): boolean {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  return Boolean(editor.view.someProp('handleKeyDown', (handle) => handle(editor.view, event)))
}
const bKey = { key: 'b', code: 'KeyB', keyCode: 66 }

test('without a handler no key is taken', () => {
  expect(press({ ...bKey, ...MOD })).toBe(true) // Bold's own
  expect(editor.isActive('bold')).toBe(true)
})

test('a handler that takes the key runs before the editor\'s own, so the person\'s choice wins', () => {
  const handle = jest.fn(() => true)
  setStyleChordHandler(editor, handle)
  expect(press({ ...bKey, ...MOD })).toBe(true)
  expect(handle).toHaveBeenCalledTimes(1)
  expect(editor.isActive('bold')).toBe(false)
})

test('a handler that leaves the key lets the editor have it', () => {
  setStyleChordHandler(editor, () => false)
  press({ ...bKey, ...MOD })
  expect(editor.isActive('bold')).toBe(true)
})

test('setting null takes the handler away', () => {
  const handle = jest.fn(() => true)
  setStyleChordHandler(editor, handle)
  setStyleChordHandler(editor, null)
  press({ ...bKey, ...MOD })
  expect(handle).not.toHaveBeenCalled()
  expect(editor.isActive('bold')).toBe(true)
})
