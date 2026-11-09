import type { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { BODY_ATTRS, snapshotAttrs } from '@/data/customParagraphStyle'
import { applyCustomParagraphStyle, refreshCustomParagraphStyles, styleRefreshes } from './customParagraphStyleCommand'

const OWNER = 3
const callout = { id: 7, name: 'Callout', base: 'quote' as const, properties: { size: 20 } }
const edited = { ...callout, name: 'Big callout', properties: { size: 28 } }

interface FakeNode {
  type: { name: string }
  attrs: Record<string, unknown>
  children?: FakeNode[]
}
const paragraph = (attrs: Record<string, unknown>): FakeNode => ({ type: { name: 'paragraph' }, attrs })

// A document whose nodes are numbered in the order they are visited, which is
// all the code under test needs of positions.
function fakeDoc(children: FakeNode[]) {
  const nodes: FakeNode[] = []
  const walk = (list: FakeNode[], visit?: (node: FakeNode, pos: number) => boolean | void) => list.forEach((node) => {
    const pos = nodes.push(node) - 1
    if (visit?.(node, pos) !== false && node.children) walk(node.children, visit)
  })
  walk(children)
  const doc = {
    descendants(visit: (node: FakeNode, pos: number) => boolean | void) {
      nodes.length = 0
      walk(children, visit)
    },
    nodeAt: (pos: number) => nodes[pos],
  }
  return doc as unknown as ProseMirrorNode & { nodeAt: (pos: number) => FakeNode }
}

const doc = () => fakeDoc([
  { type: { name: 'heading' }, attrs: { level: 1 } },
  paragraph(snapshotAttrs(callout, OWNER) as unknown as Record<string, unknown>),
  paragraph({ style: 'quote' }),
  { type: { name: 'bulletList' }, attrs: {}, children: [{ type: { name: 'listItem' }, attrs: {}, children: [paragraph(snapshotAttrs(callout, OWNER) as unknown as Record<string, unknown>)] }] },
  paragraph(snapshotAttrs({ ...callout, id: 9 }, 99) as unknown as Record<string, unknown>),
])

test('only the paragraphs whose copy is out of date are found, including those inside lists', () => {
  expect(styleRefreshes(doc(), [callout], OWNER)).toEqual([])
  const found = styleRefreshes(doc(), [edited], OWNER)
  expect(found).toHaveLength(2)
  expect(found.map((r) => r.attrs)).toEqual([snapshotAttrs(edited, OWNER), snapshotAttrs(edited, OWNER)])
})

test('a deleted style\'s paragraphs become Body, and someone else\'s style is left alone', () => {
  const found = styleRefreshes(doc(), [], OWNER)
  expect(found).toHaveLength(2)
  expect(found.every((r) => r.attrs === BODY_ATTRS)).toBe(true)
})

// An editor whose transaction records what it is asked to do.
function fakeEditor(document: ReturnType<typeof doc>) {
  const marked: { pos: number; attrs: Record<string, unknown> }[] = []
  const meta: Record<string, unknown> = {}
  const tr: Record<string, unknown> = {
    doc: document,
    setNodeMarkup: (pos: number, _type: unknown, attrs: Record<string, unknown>) => { marked.push({ pos, attrs }); return tr },
    setMeta: (key: string, value: unknown) => { meta[key] = value; return tr },
  }
  const dispatched: unknown[] = []
  const editor = { state: { doc: document, tr }, view: { dispatch: (transaction: unknown) => dispatched.push(transaction) } } as unknown as Editor
  return { editor, marked, meta, dispatched }
}

test('refreshing rewrites the stale paragraphs in one transaction that stays out of undo history', () => {
  const { editor, marked, meta, dispatched } = fakeEditor(doc())
  expect(refreshCustomParagraphStyles(editor, [edited], OWNER)).toBe(true)
  expect(dispatched).toHaveLength(1)
  expect(marked).toHaveLength(2)
  expect(marked[0].attrs).toEqual(snapshotAttrs(edited, OWNER))
  expect(meta.addToHistory).toBe(false)
})

test('refreshing keeps the other attributes of a paragraph', () => {
  const document = fakeDoc([paragraph({ ...snapshotAttrs(callout, OWNER), other: 'kept' })])
  const { editor, marked } = fakeEditor(document)
  refreshCustomParagraphStyles(editor, [edited], OWNER)
  expect(marked[0].attrs).toEqual({ ...snapshotAttrs(edited, OWNER), other: 'kept' })
})

test('refreshing a document that is already current changes nothing', () => {
  const { editor, marked, dispatched } = fakeEditor(doc())
  expect(refreshCustomParagraphStyles(editor, [callout], OWNER)).toBe(false)
  expect(dispatched).toEqual([])
  expect(marked).toEqual([])
})

test('applying a style turns the block into a paragraph and puts the style\'s copy on it', () => {
  const calls: string[] = []
  const attributes: unknown[] = []
  const chain: Record<string, (...args: unknown[]) => unknown> = {
    focus: () => chain,
    setParagraph: () => { calls.push('paragraph'); return chain },
    updateAttributes: (type, attrs) => { calls.push(String(type)); attributes.push(attrs); return chain },
    run: () => true,
  }
  applyCustomParagraphStyle({ chain: () => chain } as unknown as Editor, callout, OWNER)
  expect(calls).toEqual(['paragraph', 'paragraph'])
  expect(attributes).toEqual([snapshotAttrs(callout, OWNER)])
})
