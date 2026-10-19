import { Editor } from '@tiptap/core'
import TiptapDocument from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { DocumentLink } from './DocumentLink'

// The node view is a React component; the editor here has no React to render it.
jest.mock('@tiptap/react', () => ({ ReactNodeViewRenderer: () => () => ({ dom: globalThis.document.createElement('span') }) }))
jest.mock('@/components/editors/DocumentLinkView', () => function DocumentLinkViewMock() { return null })

const onTrigger = jest.fn()
let editor: Editor

// An editor holding one paragraph with `text`, the cursor at its end.
function createEditor(text: string, triggers?: ('[[' | '@')[]) {
  editor = new Editor({
    extensions: [TiptapDocument, Paragraph, Text, DocumentLink.configure({ onTrigger, ...(triggers && { triggers }) })],
    content: { type: 'doc', content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }] },
  })
  editor.commands.setTextSelection(editor.state.doc.content.size - 1)
  return editor
}
afterEach(() => { editor.destroy(); onTrigger.mockClear() })

// Types one character the way the browser reports it to ProseMirror; true when a plugin took it.
const type = (char: string) => {
  const { from, to } = editor.state.selection
  return Boolean(editor.view.someProp('handleTextInput', (handle) => handle(editor.view, from, to, char, () => editor.state.tr)))
}

test('a link holds the document id and reads it back from HTML', () => {
  createEditor('See ')
  editor.commands.insertDocumentLink(7)
  expect(editor.getJSON().content?.[0].content).toEqual([
    { type: 'text', text: 'See ' },
    { type: 'documentLink', attrs: { documentId: 7 } },
    { type: 'text', text: ' ' },
  ])
  expect(editor.getHTML()).toContain('data-type="documentLink"')
  expect(editor.getHTML()).toContain('data-document-id="7"')

  editor.commands.setContent('<p>Go <span data-type="documentLink" data-document-id="12"></span></p>')
  expect(editor.getJSON().content?.[0].content?.[1]).toEqual({ type: 'documentLink', attrs: { documentId: 12 } })
})

test('typing [[ takes the first bracket out and opens the picker', () => {
  createEditor('See [')
  expect(type('[')).toBe(true)
  expect(editor.getText()).toBe('See ')
  expect(onTrigger).toHaveBeenCalledWith('[[')
})

test('a single bracket is typed normally', () => {
  createEditor('See ')
  expect(type('[')).toBe(false)
  expect(onTrigger).not.toHaveBeenCalled()
})

test('@ opens the picker at the start of a word, leaving the text alone', () => {
  createEditor('See ')
  expect(type('@')).toBe(true)
  expect(editor.getText()).toBe('See ')
  expect(onTrigger).toHaveBeenCalledWith('@')
})

test('@ inside a word, such as an email address, is typed normally', () => {
  createEditor('pat')
  expect(type('@')).toBe(false)
  expect(onTrigger).not.toHaveBeenCalled()
})

test('a trigger can be switched off', () => {
  createEditor('See ', ['[['])
  expect(type('@')).toBe(false)
  expect(onTrigger).not.toHaveBeenCalled()
})

test('cancelling the picker puts the typed trigger back', () => {
  createEditor('See ')
  editor.commands.restoreDocumentLinkTrigger('@')
  expect(editor.getText()).toBe('See @')
  editor.commands.restoreDocumentLinkTrigger('')
  expect(editor.getText()).toBe('See @')
})
