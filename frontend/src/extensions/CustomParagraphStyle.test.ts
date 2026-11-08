import { Editor } from '@tiptap/core'
import TiptapDocument from '@tiptap/extension-document'
import Text from '@tiptap/extension-text'
import { StyledParagraph } from './StyledParagraph'
import { CustomParagraphStyle } from './CustomParagraphStyle'

let editor: Editor
function createEditor(style: string | null) {
  const attrs = style === null ? {} : { style }
  editor = new Editor({
    extensions: [TiptapDocument, StyledParagraph, Text, CustomParagraphStyle],
    content: { type: 'doc', content: [{ type: 'paragraph', attrs, content: [{ type: 'text', text: 'Hello' }] }] },
  })
  return editor
}
afterEach(() => editor.destroy())

const callout = { id: 7, name: 'Callout', base: 'quote' as const, properties: { size: 20, color: '#2563eb' } }
const paragraph = () => editor.view.dom.querySelector('p') as HTMLElement

test('a paragraph that refers to a style the editor does not know is drawn plain', () => {
  createEditor('custom-7')
  expect(paragraph().getAttribute('data-style')).toBe('custom-7')
  expect(paragraph().getAttribute('style')).toBeNull()
  expect(paragraph().getAttribute('data-style-base')).toBeNull()
})

test('once the editor knows the style, the paragraph is drawn in it', () => {
  createEditor('custom-7')
  editor.commands.setCustomStyles([callout])
  expect(paragraph().getAttribute('data-style-base')).toBe('quote')
  expect(paragraph().getAttribute('style')).toContain('font-size: 20px')
  expect(paragraph().getAttribute('style')).toContain('color: #2563eb')
})

test('changing the definition restyles the paragraph, and forgetting it draws it plain again', () => {
  createEditor('custom-7')
  editor.commands.setCustomStyles([callout])
  editor.commands.setCustomStyles([{ ...callout, properties: { size: 24 } }])
  expect(paragraph().getAttribute('style')).toContain('font-size: 24px')
  expect(paragraph().getAttribute('style')).not.toContain('color')
  editor.commands.setCustomStyles([])
  expect(paragraph().getAttribute('style')).toBeNull()
})

test('a paragraph with a built-in style, or none, is not decorated', () => {
  createEditor('quote')
  editor.commands.setCustomStyles([callout])
  expect(paragraph().getAttribute('style')).toBeNull()
  editor.destroy()
  createEditor(null)
  editor.commands.setCustomStyles([callout])
  expect(paragraph().getAttribute('style')).toBeNull()
})

test('unsafe values in a definition never reach the page', () => {
  createEditor('custom-7')
  editor.commands.setCustomStyles([{ id: 7, name: 'x', base: 'quote', properties: { color: 'red; background: url(x)', size: 20 } } as never])
  expect(paragraph().getAttribute('style')).toBe('font-size: 20px')
})

test('the document keeps only the reference', () => {
  createEditor('custom-7')
  editor.commands.setCustomStyles([callout])
  expect(editor.getJSON().content?.[0].attrs).toEqual({ style: 'custom-7' })
})
