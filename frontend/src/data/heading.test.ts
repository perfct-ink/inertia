import {
  anchorFromHash, anchorsFor, documentPath, headingsOf, idsToStore, indexOfAnchor, linkableHeadings,
  parseDocumentHref, slugify,
} from './heading'

const heading = (text: string, attrs: Record<string, unknown> = {}) => ({
  type: 'heading', attrs: { level: 2, ...attrs }, content: text ? [{ type: 'text', text }] : [],
})
const doc = (...content: unknown[]) => ({ type: 'doc', content })

test('slugify makes a readable, URL-safe anchor', () => {
  expect(slugify('Launch plan')).toBe('launch-plan')
  expect(slugify('  Launch plan: Q3!  ')).toBe('launch-plan-q3')
  expect(slugify('Café déjà vu')).toBe('cafe-deja-vu')
  expect(slugify('Überblick 2026')).toBe('uberblick-2026')
  expect(slugify('日本語 の 見出し')).toBe('日本語-の-見出し')
  expect(slugify('!!!')).toBe('')
  expect(slugify('')).toBe('')
})

test('slugify caps the length without leaving a trailing dash', () => {
  const slug = slugify('word '.repeat(30))
  expect(slug.length).toBeLessThanOrEqual(48)
  expect(slug.endsWith('-')).toBe(false)
})

test('a stored id is the anchor and survives a rename', () => {
  expect(anchorsFor([{ id: 'intro', text: 'Something else entirely' }])).toEqual(['intro'])
})

test('a heading without an id gets the slug of its text, numbered when taken', () => {
  const anchors = anchorsFor([
    { id: null, text: 'Intro' },
    { id: null, text: 'Intro' },
    { id: null, text: 'Intro' },
    { id: null, text: '' },
  ])
  expect(anchors).toEqual(['intro', 'intro-2', 'intro-3', null])
})

test('stored ids are claimed before slugs, so a slug never steals one', () => {
  expect(anchorsFor([{ id: null, text: 'Intro' }, { id: 'intro', text: 'Other' }])).toEqual(['intro-2', 'intro'])
})

test('a repeated id (a pasted copy) is replaced on the later heading', () => {
  expect(anchorsFor([{ id: 'plan', text: 'Plan' }, { id: 'plan', text: 'Plan B' }])).toEqual(['plan', 'plan-b'])
})

test('idsToStore lists only the headings that need an id', () => {
  const headings = [
    { id: 'intro', text: 'Intro', level: 2 },
    { id: null, text: 'Scope', level: 2 },
    { id: null, text: '', level: 2 },
    { id: 'plan', text: 'Plan', level: 2 },
    { id: 'plan', text: 'Plan again', level: 2 },
  ]
  const ids = idsToStore(headings)
  expect(ids).toEqual([null, 'scope', null, null, 'plan-again'])
  // Once stored, nothing changes any more.
  const stored = headings.map((h, i) => ({ ...h, id: ids[i] ?? h.id }))
  expect(idsToStore(stored)).toEqual([null, null, null, null, null])
})

test('a stored anchor still finds its heading after the heading is renamed and moved', () => {
  const stored = [{ id: 'intro', text: 'Intro', level: 2 }, { id: 'scope', text: 'Scope', level: 2 }]
  const edited = [{ id: 'scope', text: 'Scope and goals', level: 2 }, { id: 'intro', text: 'Welcome', level: 2 }]
  expect(indexOfAnchor(stored, 'scope')).toBe(1)
  expect(indexOfAnchor(edited, 'scope')).toBe(0)
  expect(indexOfAnchor(edited, 'intro')).toBe(1)
  expect(indexOfAnchor(edited, 'gone')).toBe(-1)
})

test('a heading with no id yet is found by the slug of its text', () => {
  const headings = [{ id: null, text: 'Intro', level: 2 }, { id: null, text: 'Scope', level: 2 }]
  expect(indexOfAnchor(headings, 'scope')).toBe(1)
})

test('headingsOf reads ids, levels and text from nested content', () => {
  const content = doc(
    heading('Title', { level: 1 }),
    { type: 'paragraph', content: [{ type: 'text', text: 'Body' }] },
    { type: 'bulletList', content: [{ type: 'listItem', content: [heading('Nested', { id: 'n1', level: 3 })] }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Two' }, { type: 'hardBreak' }, { type: 'text', text: 'lines ' }] },
  )
  expect(headingsOf(content)).toEqual([
    { id: null, text: 'Title', level: 1 },
    { id: 'n1', text: 'Nested', level: 3 },
    { id: null, text: 'Two lines', level: 2 },
  ])
  expect(headingsOf(null)).toEqual([])
  expect(headingsOf({})).toEqual([])
})

test('linkableHeadings leaves out the title and empty headings', () => {
  const content = doc(heading('Title', { level: 1 }), heading('Goals'), heading(''), heading('Goals'), heading('Risks', { id: 'r-1', level: 3 }))
  expect(linkableHeadings(content)).toEqual([
    { anchor: 'goals', text: 'Goals', level: 2 },
    { anchor: 'goals-2', text: 'Goals', level: 2 },
    { anchor: 'r-1', text: 'Risks', level: 3 },
  ])
  expect(linkableHeadings(null)).toEqual([])
})

test('documentPath builds a document or heading path', () => {
  expect(documentPath({ documentId: 12, anchor: null })).toBe('/documents/12')
  expect(documentPath({ documentId: 12, anchor: 'launch-plan' })).toBe('/documents/12#launch-plan')
  expect(documentPath({ documentId: 12, anchor: '日本語' })).toBe('/documents/12#%E6%97%A5%E6%9C%AC%E8%AA%9E')
})

test('parseDocumentHref reads in-app links and ignores the rest', () => {
  expect(parseDocumentHref('/documents/12')).toEqual({ documentId: 12, anchor: null })
  expect(parseDocumentHref('/documents/12#launch-plan')).toEqual({ documentId: 12, anchor: 'launch-plan' })
  expect(parseDocumentHref('/documents/12#%E6%97%A5%E6%9C%AC%E8%AA%9E')).toEqual({ documentId: 12, anchor: '日本語' })
  expect(parseDocumentHref('#/documents/12#intro')).toEqual({ documentId: 12, anchor: 'intro' })
  expect(parseDocumentHref('https://app.test/#/documents/12#intro', 'https://app.test')).toEqual({ documentId: 12, anchor: 'intro' })
  expect(parseDocumentHref('https://app.test/documents/7', 'https://app.test')).toEqual({ documentId: 7, anchor: null })
  expect(parseDocumentHref('https://other.test/#/documents/12', 'https://app.test')).toBeNull()
  expect(parseDocumentHref('https://app.test.evil.com/#/documents/12', 'https://app.test')).toBeNull()
  expect(parseDocumentHref('https://example.com/documents/12')).toBeNull()
  expect(parseDocumentHref('/documents/abc')).toBeNull()
  expect(parseDocumentHref('/folders/3')).toBeNull()
  expect(parseDocumentHref('mailto:a@b.co')).toBeNull()
})

test('documentPath and parseDocumentHref round-trip', () => {
  const target = { documentId: 5, anchor: 'q3 plan/ü' }
  expect(parseDocumentHref(documentPath(target))).toEqual(target)
})

test('anchorFromHash decodes the location hash', () => {
  expect(anchorFromHash('#launch-plan')).toBe('launch-plan')
  expect(anchorFromHash('#%E6%97%A5')).toBe('日')
  expect(anchorFromHash('#%E0%A4%A')).toBe('%E0%A4%A')
  expect(anchorFromHash('#')).toBeNull()
  expect(anchorFromHash('')).toBeNull()
})
