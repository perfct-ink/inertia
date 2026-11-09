import { Editor } from '@tiptap/core'
import TiptapDocument from '@tiptap/extension-document'
import Link from '@tiptap/extension-link'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { BROKEN_LINK_CLASS, BrokenLinks, linkRangeAt, relinkTo, removeLinkAt, setBrokenLinks } from './BrokenLinks'

const PLAN = '/documents/2#plan'
const NOTES = '/documents/3'

const linked = (value: string, href: string) => ({ type: 'text', text: value, marks: [{ type: 'link', attrs: { href } }] })
const plain = (value: string) => ({ type: 'text', text: value })

// Positions: "See " is 1-5, "Plan" 5-9, " and " 9-14, "Notes" 14-19; the second
// paragraph starts at 20, so "One" is 21-24 and "Two" 24-27 (two links touching).
const CONTENT = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [plain('See '), linked('Plan', PLAN), plain(' and '), linked('Notes', NOTES)] },
    { type: 'paragraph', content: [linked('One', PLAN), linked('Two', NOTES)] },
  ],
}

let editor: Editor
beforeEach(() => {
  editor = new Editor({
    extensions: [TiptapDocument, Paragraph, Text, BrokenLinks, Link.configure({ openOnClick: false })],
    content: CONTENT,
  })
})
afterEach(() => editor.destroy())

const marked = () => Array.from(editor.view.dom.querySelectorAll(`.${BROKEN_LINK_CLASS}`)).map((el) => el.textContent)

test('only the links whose href is marked broken get the class', () => {
  setBrokenLinks(editor, new Set([PLAN]))
  expect(marked()).toEqual(['Plan', 'One'])
  setBrokenLinks(editor, new Set([NOTES]))
  expect(marked()).toEqual(['Notes', 'Two'])
  setBrokenLinks(editor, new Set())
  expect(marked()).toEqual([])
})

test('marking changes nothing in the saved document', () => {
  const before = JSON.stringify(editor.getJSON())
  setBrokenLinks(editor, new Set([PLAN]))
  expect(JSON.stringify(editor.getJSON())).toBe(before)
  expect(editor.getHTML()).not.toContain(BROKEN_LINK_CLASS)
})

test('the marks follow the text when the document changes', () => {
  setBrokenLinks(editor, new Set([PLAN]))
  editor.commands.insertContentAt(1, 'Hello ')
  expect(marked()).toEqual(['Plan', 'One'])
})

test('linkRangeAt finds the whole link from its start, middle or end', () => {
  for (const pos of [5, 7, 9]) {
    expect(linkRangeAt(editor, pos, PLAN)).toEqual({ from: 5, to: 9, text: 'Plan' })
  }
  expect(linkRangeAt(editor, 16, NOTES)).toEqual({ from: 14, to: 19, text: 'Notes' })
})

test('linkRangeAt finds nothing for text that is not that link', () => {
  expect(linkRangeAt(editor, 2, PLAN)).toBeNull()
  expect(linkRangeAt(editor, 7, NOTES)).toBeNull()
  expect(linkRangeAt(editor, 1000, PLAN)).toBeNull()
})

test('linkRangeAt keeps two links that touch apart', () => {
  expect(linkRangeAt(editor, 22, PLAN)).toEqual({ from: 21, to: 24, text: 'One' })
  expect(linkRangeAt(editor, 24, NOTES)).toEqual({ from: 24, to: 27, text: 'Two' })
  expect(linkRangeAt(editor, 26, PLAN)).toBeNull()
})

test('relinkTo points the link at another heading and keeps its text', () => {
  const range = linkRangeAt(editor, 6, PLAN)!
  relinkTo(editor, range, { documentId: 9, anchor: 'goals', text: 'Goals' })
  const first = (editor.getJSON().content ?? [])[0].content ?? []
  expect(first.map((node) => node.text)).toEqual(['See ', 'Plan', ' and ', 'Notes'])
  expect(first[1].marks?.[0].attrs?.href).toBe('/documents/9#goals')
  expect(first[3].marks?.[0].attrs?.href).toBe(NOTES)
})

test('removeLinkAt drops the link and keeps the text', () => {
  const range = linkRangeAt(editor, 6, PLAN)!
  removeLinkAt(editor, range)
  const first = (editor.getJSON().content ?? [])[0].content ?? []
  expect(first.map((node) => node.text).join('')).toBe('See Plan and Notes')
  expect(first.filter((node) => node.marks?.some((mark) => mark.type === 'link')).map((node) => node.text)).toEqual(['Notes'])
})
