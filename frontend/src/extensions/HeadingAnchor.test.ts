import { Editor } from '@tiptap/core'
import TiptapDocument from '@tiptap/extension-document'
import Link from '@tiptap/extension-link'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { HeadingAnchor, assignHeadingIds, findHeadingPos, headingsInDoc, linkToHeading } from './HeadingAnchor'

const text = (value: string) => [{ type: 'text', text: value }]
const heading = (value: string, attrs: Record<string, unknown> = {}) => ({
  type: 'heading', attrs: { level: 2, ...attrs }, content: text(value),
})
const CONTENT = {
  type: 'doc',
  content: [
    heading('Title', { level: 1 }),
    heading('Intro', { id: 'intro' }),
    { type: 'paragraph', content: text('Body text') },
    heading('Scope and goals'),
  ],
}

let editor: Editor
function createEditor(content: Record<string, unknown> = CONTENT) {
  editor = new Editor({
    extensions: [TiptapDocument, Paragraph, Text, HeadingAnchor, Link.configure({ openOnClick: false })],
    content,
  })
  return editor
}
afterEach(() => editor.destroy())

type JsonNode = { type: string; attrs?: Record<string, unknown>; content?: JsonNode[]; marks?: unknown[] }
const nodes = () => (editor.getJSON().content ?? []) as JsonNode[]

test('a heading keeps its id in the document and in the HTML', () => {
  createEditor()
  expect(nodes()[1].attrs).toEqual({ level: 2, id: 'intro' })
  expect(nodes()[3].attrs).toEqual({ level: 2, id: null })
  expect(editor.getHTML()).toContain('data-heading-id="intro"')
  expect(editor.getHTML()).not.toContain('data-heading-id="null"')
})

test('the id is read back from pasted or loaded HTML', () => {
  createEditor({ type: 'doc', content: [{ type: 'paragraph' }] })
  editor.commands.setContent('<h2 data-heading-id="from-html">Hello</h2>')
  expect(nodes()[0].attrs).toEqual({ level: 2, id: 'from-html' })
})

test('headingsInDoc lists the headings with their positions', () => {
  createEditor()
  const found = headingsInDoc(editor.state.doc)
  expect(found.map(({ id, text: label, level }) => ({ id, label, level }))).toEqual([
    { id: null, label: 'Title', level: 1 },
    { id: 'intro', label: 'Intro', level: 2 },
    { id: null, label: 'Scope and goals', level: 2 },
  ])
  expect(editor.state.doc.nodeAt(found[1].pos)?.textContent).toBe('Intro')
})

test('findHeadingPos finds a heading by its stored id or by the slug of its text', () => {
  createEditor()
  const intro = findHeadingPos(editor.state.doc, 'intro')
  expect(intro).not.toBeNull()
  expect(editor.state.doc.nodeAt(intro as number)?.textContent).toBe('Intro')
  const scope = findHeadingPos(editor.state.doc, 'scope-and-goals')
  expect(editor.state.doc.nodeAt(scope as number)?.textContent).toBe('Scope and goals')
  expect(findHeadingPos(editor.state.doc, 'missing')).toBeNull()
})

test('assignHeadingIds stores an id on headings that lack one, once', () => {
  createEditor()
  expect(assignHeadingIds(editor)).toBe(true)
  expect(nodes().filter((n) => n.type === 'heading').map((n) => n.attrs?.id)).toEqual(['title', 'intro', 'scope-and-goals'])
  expect(assignHeadingIds(editor)).toBe(false)
})

test('an assigned id stays when the heading is renamed', () => {
  createEditor()
  assignHeadingIds(editor)
  const pos = findHeadingPos(editor.state.doc, 'scope-and-goals') as number
  editor.chain().setTextSelection({ from: pos + 1, to: pos + 1 + 'Scope and goals'.length }).insertContent('Aims').run()
  assignHeadingIds(editor)
  expect(nodes()[3].attrs?.id).toBe('scope-and-goals')
  expect(findHeadingPos(editor.state.doc, 'scope-and-goals')).toBe(pos)
})

test('linkToHeading inserts the heading text as a link when nothing is selected', () => {
  createEditor()
  editor.commands.setTextSelection(editor.state.doc.nodeSize - 3)
  linkToHeading(editor, { documentId: 9, anchor: 'launch-plan', text: 'Launch plan' })
  const linked = nodes().flatMap((n) => n.content ?? []).find((n) => (n as { text?: string }).text === 'Launch plan')
  expect(linked?.marks).toEqual([{ type: 'link', attrs: expect.objectContaining({ href: '/documents/9#launch-plan' }) }])
})

test('linkToHeading links the selected text instead of inserting', () => {
  createEditor()
  const para = nodes().findIndex((n) => n.type === 'paragraph')
  expect(para).toBeGreaterThan(-1)
  const from = (headingsInDoc(editor.state.doc)[1].pos) + editor.state.doc.child(1).nodeSize + 1
  editor.commands.setTextSelection({ from, to: from + 4 })
  linkToHeading(editor, { documentId: 4, anchor: 'intro', text: 'Intro' })
  const content = (nodes()[para].content ?? []) as { text?: string; marks?: unknown[] }[]
  expect(content[0].text).toBe('Body')
  expect(content[0].marks).toEqual([{ type: 'link', attrs: expect.objectContaining({ href: '/documents/4#intro' }) }])
})
