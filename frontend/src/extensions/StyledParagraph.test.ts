import { Editor } from '@tiptap/core'
import TiptapDocument from '@tiptap/extension-document'
import Text from '@tiptap/extension-text'
import { snapshotAttrs } from '@/data/customParagraphStyle'
import { StyledParagraph } from './StyledParagraph'

let editor: Editor
function createEditor(content: unknown) {
  editor = new Editor({ extensions: [TiptapDocument, StyledParagraph, Text], content: content as never })
  return editor
}
function withAttrs(attrs: object) {
  return { type: 'doc', content: [{ type: 'paragraph', attrs, content: [{ type: 'text', text: 'Hello' }] }] }
}
afterEach(() => editor.destroy())

const callout = { id: 7, name: 'Callout', base: 'quote' as const, properties: { size: 20, color: '#2563eb' } }
const paragraph = () => editor.view.dom.querySelector('p') as HTMLElement

test('a paragraph in a custom style is drawn from the copy of the style it carries', () => {
  createEditor(withAttrs(snapshotAttrs(callout, 3)))
  expect(paragraph().getAttribute('data-style')).toBe('custom-7')
  expect(paragraph().getAttribute('data-style-base')).toBe('quote')
  expect(paragraph().getAttribute('style')).toContain('font-size: 20px')
  // The DOM normalises colours, so the value is read back from the element's style.
  expect(paragraph().style.color).toBe('rgb(37, 99, 235)')
})

test('the document keeps the style, its name and the copy of its formatting', () => {
  createEditor(withAttrs(snapshotAttrs(callout, 3)))
  const attrs = editor.getJSON().content?.[0].attrs
  expect(attrs).toEqual(snapshotAttrs(callout, 3))
  expect(JSON.parse(attrs?.styleProps)).toEqual({ owner: 3, base: 'quote', properties: { size: 20, color: '#2563eb' } })
})

test('changing the copy redraws the paragraph', () => {
  createEditor(withAttrs(snapshotAttrs(callout, 3)))
  editor.commands.updateAttributes('paragraph', snapshotAttrs({ ...callout, properties: { size: 28 } }, 3))
  expect(paragraph().getAttribute('style')).toContain('font-size: 28px')
  expect(paragraph().getAttribute('style')).not.toContain('color')
})

test('a plain paragraph and one in a built-in style carry no copy', () => {
  createEditor({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] })
  expect(editor.getJSON().content?.[0].attrs).toEqual({ style: 'body', styleName: null, styleProps: null })
  expect(paragraph().getAttribute('style')).toBeNull()
  editor.destroy()
  createEditor(withAttrs({ style: 'quote' }))
  expect(paragraph().getAttribute('data-style')).toBe('quote')
  expect(paragraph().getAttribute('style')).toBeNull()
})

test('a leftover copy on a paragraph that is no longer in a custom style is not drawn', () => {
  createEditor(withAttrs({ ...snapshotAttrs(callout, 3), style: 'caption' }))
  expect(paragraph().getAttribute('data-style')).toBe('caption')
  expect(paragraph().getAttribute('data-style-base')).toBeNull()
  expect(paragraph().getAttribute('style')).toBeNull()
})

test('unsafe values in a copy never reach the page', () => {
  const styleProps = JSON.stringify({ owner: 1, base: 'quote', properties: { color: 'red; background: url(x)', size: 20 } })
  createEditor(withAttrs({ style: 'custom-7', styleName: 'x', styleProps }))
  expect(paragraph().style.fontSize).toBe('20px')
  expect(paragraph().style.color).toBe('')
  expect(paragraph().style.background).toBe('')
})

test('the copy survives copying and pasting the paragraph as HTML', () => {
  createEditor(withAttrs(snapshotAttrs(callout, 3)))
  const html = editor.getHTML()
  editor.destroy()
  createEditor(html)
  expect(editor.getJSON().content?.[0].attrs).toEqual(snapshotAttrs(callout, 3))
  expect(paragraph().getAttribute('style')).toContain('font-size: 20px')
})
