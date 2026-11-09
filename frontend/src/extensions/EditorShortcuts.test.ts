import { Editor } from '@tiptap/core'
import TiptapDocument from '@tiptap/extension-document'
import Bold from '@tiptap/extension-bold'
import BulletList from '@tiptap/extension-bullet-list'
import CodeBlock from '@tiptap/extension-code-block'
import ListItem from '@tiptap/extension-list-item'
import OrderedList from '@tiptap/extension-ordered-list'
import Paragraph from '@tiptap/extension-paragraph'
import Strike from '@tiptap/extension-strike'
import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import Text from '@tiptap/extension-text'
import { EDITOR_COMMAND_EVENT, replacedKeys } from '@/data/editorShortcut'
import { EditorShortcuts } from './EditorShortcuts'
import { withoutShortcuts } from './withoutShortcuts'

// The same extensions DocumentScreen wires up for these keys: the four whose
// defaults the shortcut table replaces, tables, and the table itself.
let editor: Editor
let linkDialogs = 0
function createEditor(content: string) {
  linkDialogs = 0
  editor = new Editor({
    extensions: [
      TiptapDocument,
      Paragraph,
      Text,
      withoutShortcuts(Strike, replacedKeys('strike')),
      withoutShortcuts(BulletList, replacedKeys('bulletList')),
      withoutShortcuts(OrderedList, replacedKeys('orderedList')),
      ListItem,
      withoutShortcuts(CodeBlock, replacedKeys('codeBlock')),
      Bold,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      EditorShortcuts.configure({ openLinkDialog: () => { linkDialogs++ } }),
    ],
    content,
  })
  editor.commands.focus('end')
  return editor
}
afterEach(() => editor.destroy())

// ⌘ on a Mac, Ctrl elsewhere: what TipTap's "Mod" means here.
const MAC = /Mac|iP(hone|[oa]d)/.test(navigator.platform)
const MOD = MAC ? { metaKey: true } : { ctrlKey: true }

// Sends a keydown through the editor's key handlers; true if one took it.
function press(init: KeyboardEventInit & { keyCode: number }): boolean {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  return Boolean(editor.view.someProp('handleKeyDown', (handle) => handle(editor.view, event)))
}

// Key events as a US keyboard sends them: Shift changes the character (⇧7 is "&", ⇧X is "X"),
// and the key code stays that of the unshifted key.
const SHIFTED_DIGITS: Record<number, string> = { 7: '&', 8: '*', 9: '(' }
const shiftDigit = (n: number) => ({ key: SHIFTED_DIGITS[n], code: `Digit${n}`, keyCode: 48 + n, shiftKey: true })
const shiftLetter = (c: string) => ({ key: c.toUpperCase(), code: `Key${c.toUpperCase()}`, keyCode: c.toUpperCase().charCodeAt(0), shiftKey: true })
const letter = (c: string) => ({ key: c, code: `Key${c.toUpperCase()}`, keyCode: c.toUpperCase().charCodeAt(0) })

test('⌘⇧7 makes a bulleted list and ⌘⇧9 a numbered list', () => {
  createEditor('<p>one</p>')
  expect(press({ ...shiftDigit(7), ...MOD })).toBe(true)
  expect(editor.getHTML()).toBe('<ul><li><p>one</p></li></ul>')
  expect(press({ ...shiftDigit(7), ...MOD })).toBe(true)
  expect(editor.getHTML()).toBe('<p>one</p>')
  expect(press({ ...shiftDigit(9), ...MOD })).toBe(true)
  expect(editor.getHTML()).toBe('<ol><li><p>one</p></li></ol>')
})

test('⌘⇧8 is free: the bulleted list no longer takes it', () => {
  createEditor('<p>one</p>')
  expect(press({ ...shiftDigit(8), ...MOD })).toBe(false)
  expect(editor.getHTML()).toBe('<p>one</p>')
})

test('⌘⇧X strikes through; TipTap\'s ⌘⇧S no longer does', () => {
  createEditor('<p>one</p>')
  editor.commands.selectAll()
  expect(press({ ...shiftLetter('s'), ...MOD })).toBe(false)
  expect(editor.isActive('strike')).toBe(false)
  expect(press({ ...shiftLetter('x'), ...MOD })).toBe(true)
  expect(editor.isActive('strike')).toBe(true)
})

test('⌘⇧M makes a code block and again takes it back; TipTap\'s ⌘⌥C and the old ⌘⌥⇧C do nothing', () => {
  createEditor('<p>one</p>')
  expect(press({ ...letter('c'), ...MOD, altKey: true })).toBe(false)
  expect(press({ ...shiftLetter('c'), ...MOD, altKey: true })).toBe(false)
  expect(editor.isActive('codeBlock')).toBe(false)
  expect(press({ ...shiftLetter('m'), ...MOD })).toBe(true)
  expect(editor.isActive('codeBlock')).toBe(true)
  expect(press({ ...shiftLetter('m'), ...MOD })).toBe(true)
  expect(editor.isActive('codeBlock')).toBe(false)
})

test('the code block keeps its other keys (Backspace in an empty one turns it back)', () => {
  createEditor('<pre><code></code></pre>')
  expect(editor.isActive('codeBlock')).toBe(true)
  expect(press({ key: 'Backspace', code: 'Backspace', keyCode: 8 })).toBe(true)
  expect(editor.isActive('codeBlock')).toBe(false)
})

test('⌘] nests a list item under the one above and ⌘[ lifts it back', () => {
  createEditor('<ul><li><p>a</p></li><li><p>b</p></li></ul>')
  expect(press({ key: ']', code: 'BracketRight', keyCode: 221, ...MOD })).toBe(true)
  expect(editor.getHTML()).toBe('<ul><li><p>a</p><ul><li><p>b</p></li></ul></li></ul>')
  expect(press({ key: '[', code: 'BracketLeft', keyCode: 219, ...MOD })).toBe(true)
  expect(editor.getHTML()).toBe('<ul><li><p>a</p></li><li><p>b</p></li></ul>')
})

test('⌃⌘↑ and ⌃⌘↓ (Ctrl+Shift+↑ and ↓ on Windows and Linux) move the list item, and the cursor goes with it', () => {
  createEditor('<ul><li><p>a</p></li><li><p>b</p></li></ul>')
  const keys = MAC ? { ctrlKey: true, metaKey: true } : { ctrlKey: true, shiftKey: true }
  expect(press({ key: 'ArrowUp', code: 'ArrowUp', keyCode: 38, ...keys })).toBe(true)
  expect(editor.getHTML()).toBe('<ul><li><p>b</p></li><li><p>a</p></li></ul>')
  expect(editor.state.selection.$from.parent.textContent).toBe('b')
  expect(press({ key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, ...keys })).toBe(true)
  expect(editor.getHTML()).toBe('<ul><li><p>a</p></li><li><p>b</p></li></ul>')
  expect(editor.state.selection.$from.parent.textContent).toBe('b')
})

test('⌘\\ clears formatting', () => {
  createEditor('<p>one</p>')
  editor.commands.selectAll()
  editor.commands.toggleStrike()
  expect(editor.isActive('strike')).toBe(true)
  expect(press({ key: '\\', code: 'Backslash', keyCode: 220, ...MOD })).toBe(true)
  expect(editor.isActive('strike')).toBe(false)
})

test('⌘K opens the link dialog', () => {
  createEditor('<p>one</p>')
  expect(press({ ...letter('k'), ...MOD })).toBe(true)
  expect(linkDialogs).toBe(1)
})

// The table key is Mac only: Windows and Linux have the toolbar button.
const onMac = MAC ? test : test.skip
onMac('⌥⌘T inserts a table', () => {
  createEditor('<p>one</p>')
  expect(press({ ...letter('t'), ...MOD, altKey: true })).toBe(true)
  expect(editor.isActive('table')).toBe(true)
})

// TipTap sets isFocused from the DOM's focus events, which fire later than these tests run,
// so the tests say where the cursor is.
test('a Format menu command runs on the editor that has the cursor', () => {
  createEditor('<p>one</p>')
  editor.commands.selectAll()
  editor.isFocused = true
  window.dispatchEvent(new CustomEvent(EDITOR_COMMAND_EVENT, { detail: 'bold' }))
  expect(editor.isActive('bold')).toBe(true)
})

test('a Format menu command leaves an editor without the cursor alone, and ignores an unknown one', () => {
  createEditor('<p>one</p>')
  editor.commands.selectAll()
  editor.isFocused = false
  window.dispatchEvent(new CustomEvent(EDITOR_COMMAND_EVENT, { detail: 'bold' }))
  expect(editor.isActive('bold')).toBe(false)
  editor.isFocused = true
  window.dispatchEvent(new CustomEvent(EDITOR_COMMAND_EVENT, { detail: 'constructor' }))
  expect(editor.isActive('bold')).toBe(false)
})

test('a destroyed editor stops listening', () => {
  createEditor('<p>one</p>')
  editor.isFocused = true
  editor.destroy()
  expect(() => window.dispatchEvent(new CustomEvent(EDITOR_COMMAND_EVENT, { detail: 'bold' }))).not.toThrow()
})
