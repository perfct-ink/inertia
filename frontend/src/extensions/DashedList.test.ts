import { Editor } from '@tiptap/core'
import TiptapDocument from '@tiptap/extension-document'
import OrderedList from '@tiptap/extension-ordered-list'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { DashedList, LIST_SHORTCUTS, StyledListItem } from './DashedList'

type JsonNode = { type: string; text?: string; attrs?: Record<string, unknown>; content?: JsonNode[] }

const para = (text: string): JsonNode => ({ type: 'paragraph', content: [{ type: 'text', text }] })
const item = (text: string, ...nested: JsonNode[]): JsonNode => ({ type: 'listItem', content: [para(text), ...nested] })
const list = (listStyle: string, ...items: JsonNode[]): JsonNode => ({ type: 'bulletList', attrs: { listStyle }, content: items })
const doc = (...content: JsonNode[]) => ({ type: 'doc', content })

let editor: Editor
function createEditor(content: Record<string, unknown>) {
  editor = new Editor({
    extensions: [TiptapDocument, Paragraph, Text, DashedList, OrderedList, StyledListItem],
    content,
  })
  return editor
}
afterEach(() => editor.destroy())

const blocks = () => (editor.getJSON().content ?? []) as JsonNode[]

// Puts the cursor inside the text node with this text.
function cursorIn(text: string) {
  let found = -1
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text === text) found = pos + 1
  })
  editor.commands.setTextSelection(found)
}

// Types a character the way the browser would: input rules first, then the text itself.
function type(text: string) {
  const { from, to } = editor.state.selection
  const handled = editor.view.someProp('handleTextInput', (handler) => handler(editor.view, from, to, text))
  if (!handled) editor.view.dispatch(editor.state.tr.insertText(text, from, to))
}

function pressTab() {
  editor.view.someProp('handleKeyDown', (handler) => handler(editor.view, new KeyboardEvent('keydown', { key: 'Tab' })))
}

test('a dashed list keeps its style in the document and in the HTML, and a bullet list writes nothing extra', () => {
  createEditor(doc(list('dashed', item('One')), list('bullet', item('Two'))))
  expect(blocks().map((block) => block.attrs)).toEqual([{ listStyle: 'dashed' }, { listStyle: 'bullet' }])
  const html = editor.getHTML()
  expect(html).toContain('<ul data-list-style="dashed">')
  expect(html).not.toContain('data-list-style="bullet"')
})

test('the style is read back from pasted or loaded HTML, and a plain ul is a bullet list', () => {
  createEditor(doc(para('x')))
  editor.commands.setContent('<ul data-list-style="dashed"><li><p>A</p></li></ul><ul><li><p>B</p></li></ul>')
  expect(blocks().map((block) => block.attrs)).toEqual([{ listStyle: 'dashed' }, { listStyle: 'bullet' }])
})

test('a document saved before dashed lists existed loads with plain bullets', () => {
  createEditor(doc({ type: 'bulletList', content: [item('Old')] }))
  expect(blocks()[0].attrs).toEqual({ listStyle: 'bullet' })
})

test('the dashed list has no key yet, and the bullet list keeps its default (one place to change them)', () => {
  expect(LIST_SHORTCUTS).toEqual({ bullet: 'Mod-Shift-8', dashed: null })
})

test('toggleDashedList turns a paragraph into a dashed list', () => {
  createEditor(doc(para('One')))
  cursorIn('One')
  expect(editor.commands.toggleDashedList()).toBe(true)
  expect(blocks()[0]).toMatchObject({ type: 'bulletList', attrs: { listStyle: 'dashed' } })
})

test('toggleDashedList on a dashed list takes the item out of the list', () => {
  createEditor(doc(list('dashed', item('One'))))
  cursorIn('One')
  editor.commands.toggleDashedList()
  expect(blocks().map((block) => block.type)).toEqual(['paragraph'])
})

test('toggleDashedList changes a bullet list to dashed in place, and toggleBulletList changes it back', () => {
  createEditor(doc(list('bullet', item('One'), item('Two'))))
  cursorIn('One')
  editor.commands.toggleDashedList()
  expect(blocks()).toHaveLength(1)
  expect(blocks()[0]).toMatchObject({ attrs: { listStyle: 'dashed' } })
  expect(blocks()[0].content).toHaveLength(2)

  editor.commands.toggleBulletList()
  expect(blocks()).toHaveLength(1)
  expect(blocks()[0]).toMatchObject({ type: 'bulletList', attrs: { listStyle: 'bullet' } })
  expect(blocks()[0].content).toHaveLength(2)
})

test('a numbered list becomes a dashed list', () => {
  createEditor(doc({ type: 'orderedList', content: [item('One')] }))
  cursorIn('One')
  editor.commands.toggleDashedList()
  expect(blocks()[0]).toMatchObject({ type: 'bulletList', attrs: { listStyle: 'dashed' } })
})

test('only the list the cursor is in changes style, not the list around it', () => {
  createEditor(doc(list('bullet', item('One', list('bullet', item('Child'))))))
  cursorIn('Child')
  editor.commands.toggleDashedList()
  const outer = blocks()[0]
  expect(outer.attrs).toEqual({ listStyle: 'bullet' })
  expect((outer.content?.[0].content?.[1] as JsonNode).attrs).toEqual({ listStyle: 'dashed' })
})

test('a new list joins the list above it only when it has the same style', () => {
  createEditor(doc(list('dashed', item('One')), para('Two')))
  cursorIn('Two')
  editor.commands.toggleBulletList()
  expect(blocks().map((block) => block.attrs)).toEqual([{ listStyle: 'dashed' }, { listStyle: 'bullet' }])
  editor.destroy()

  createEditor(doc(list('dashed', item('One')), para('Two')))
  cursorIn('Two')
  editor.commands.toggleDashedList()
  expect(blocks()).toHaveLength(1)
  expect(blocks()[0].content).toHaveLength(2)
})

test('Tab indents a dashed item into a nested list that is dashed too', () => {
  createEditor(doc(list('dashed', item('One'), item('Two'))))
  cursorIn('Two')
  pressTab()
  const outer = blocks()[0]
  expect(outer.content).toHaveLength(1)
  const nested = outer.content?.[0].content?.[1] as JsonNode
  expect(nested).toMatchObject({ type: 'bulletList', attrs: { listStyle: 'dashed' } })
})

test('Tab on the first item of a list does nothing', () => {
  createEditor(doc(list('dashed', item('One'), item('Two'))))
  cursorIn('One')
  pressTab()
  expect(blocks()[0].content).toHaveLength(2)
})

test('typing an en dash and a space starts a dashed list, and a hyphen and a space starts a bullet list', () => {
  createEditor(doc({ type: 'paragraph' }))
  editor.commands.setTextSelection(1)
  type('\u2013')
  type(' ')
  expect(blocks()[0]).toMatchObject({ type: 'bulletList', attrs: { listStyle: 'dashed' } })
  editor.destroy()

  createEditor(doc({ type: 'paragraph' }))
  editor.commands.setTextSelection(1)
  type('-')
  type(' ')
  expect(blocks()[0]).toMatchObject({ type: 'bulletList', attrs: { listStyle: 'bullet' } })
})

test('a bullet started by typing "- " right below a dashed list stays a separate bullet list', () => {
  createEditor(doc(list('dashed', item('One')), { type: 'paragraph' }))
  editor.commands.setTextSelection(editor.state.doc.content.size - 1)
  type('-')
  type(' ')
  expect(blocks().map((block) => block.attrs)).toEqual([{ listStyle: 'dashed' }, { listStyle: 'bullet' }])
})
