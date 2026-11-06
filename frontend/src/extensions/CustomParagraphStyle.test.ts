import { Editor } from '@tiptap/core'
import TiptapDocument from '@tiptap/extension-document'
import Text from '@tiptap/extension-text'
import { StyledParagraph } from './StyledParagraph'
import { CustomParagraphStyle } from './CustomParagraphStyle'

let editor: Editor
function createEditor(content: Record<string, unknown> | string) {
  editor = new Editor({ extensions: [TiptapDocument, StyledParagraph, Text, CustomParagraphStyle], content })
  return editor
}
afterEach(() => editor.destroy())

const paragraph = (attrs: Record<string, unknown>) => ({
  type: 'doc', content: [{ type: 'paragraph', attrs, content: [{ type: 'text', text: 'Hello' }] }],
})

test('a paragraph with a custom style is drawn from its stored formatting', () => {
  const html = createEditor(paragraph({ style: 'custom-7', styleProps: { base: 'quote', size: 20, color: '#2563eb' } })).getHTML()
  expect(html).toContain('data-style="custom-7"')
  expect(html).toContain('data-style-base="quote"')
  expect(html).toContain('font-size: 20px; color: #2563eb')
})

test('formatting left on a paragraph that has gone back to a built-in style is not drawn', () => {
  const html = createEditor(paragraph({ style: 'quote', styleProps: { base: 'quote', size: 20 } })).getHTML()
  expect(html).toContain('data-style="quote"')
  expect(html).not.toContain('font-size')
  expect(html).not.toContain('data-style-props')
})

test('unsafe formatting in a document is dropped when drawn', () => {
  const html = createEditor(paragraph({ style: 'custom-7', styleProps: { base: 'body', color: 'red; background: url(x)', size: 20 } })).getHTML()
  expect(html).toContain('font-size: 20px')
  expect(html).not.toContain('background')
  expect(html).not.toContain('red')
})

test('the formatting survives copying the HTML back in', () => {
  const html = createEditor(paragraph({ style: 'custom-7', styleProps: { base: 'caption', align: 'center' } })).getHTML()
  editor.destroy()
  const paragraphNode = createEditor(html).state.doc.firstChild
  expect(paragraphNode?.attrs.style).toBe('custom-7')
  expect(paragraphNode?.attrs.styleProps).toEqual({ base: 'caption', align: 'center' })
})

test('plain paragraphs have no formatting', () => {
  const node = createEditor('<p>Hello</p>').state.doc.firstChild
  expect(node?.attrs.styleProps).toBeNull()
  expect(editor.getHTML()).toBe('<p>Hello</p>')
})
