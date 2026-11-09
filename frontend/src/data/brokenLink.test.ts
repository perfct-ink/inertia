import { BROKEN_LINK_TITLE, brokenLinkMessage, brokenLinks, documentLinksIn, linkedDocumentIds, linkLookup } from './brokenLink'

const link = (href: string, text = 'a link') => ({ type: 'text', text, marks: [{ type: 'link', attrs: { href } }] })
const paragraph = (...content: unknown[]) => ({ type: 'paragraph', content })
const doc = (...content: unknown[]) => ({ type: 'doc', content })
const heading = (text: string, id: string | null = null) => ({ id, text, level: 2 })

test('documentLinksIn finds in-app document links once each and ignores other links', () => {
  const content = doc(
    paragraph(link('/documents/12#launch-plan'), { type: 'text', text: ' and ' }, link('/documents/12#launch-plan')),
    { type: 'bulletList', content: [{ type: 'listItem', content: [paragraph(link('#/documents/7'))] }] },
    paragraph(link('https://example.com/documents/12'), link('mailto:a@example.com'), { type: 'text', text: 'plain' }),
  )
  expect(documentLinksIn(content)).toEqual([
    { href: '/documents/12#launch-plan', target: { documentId: 12, anchor: 'launch-plan' } },
    { href: '#/documents/7', target: { documentId: 7, anchor: null } },
  ])
})

test('documentLinksIn reads links behind this app\'s own origin', () => {
  expect(documentLinksIn(doc(paragraph(link('https://app.test/documents/3#intro'))), 'https://app.test')).toEqual([
    { href: 'https://app.test/documents/3#intro', target: { documentId: 3, anchor: 'intro' } },
  ])
})

test('linkedDocumentIds lists the other documents once, in order', () => {
  const links = documentLinksIn(doc(paragraph(link('/documents/9'), link('/documents/2#a'), link('/documents/2#b'), link('/documents/5#c'))))
  expect(linkedDocumentIds(links, 5)).toEqual([2, 9])
  expect(linkedDocumentIds([], 5)).toEqual([])
})

const links = documentLinksIn(doc(paragraph(
  link('/documents/1#intro'),
  link('/documents/1#missing'),
  link('/documents/2#goals'),
  link('/documents/2#gone'),
  link('/documents/3'),
  link('/documents/4#x'),
  link('/documents/6'),
)))

test('brokenLinks marks a deleted document and a deleted heading, and nothing else', () => {
  const lookup = linkLookup({
    currentId: 1,
    currentHeadings: [heading('Title'), heading('Intro', 'intro')],
    asked: [2, 3, 4],
    found: [{ id: 2, headings: [heading('Goals', 'goals')] }], // 3 and 4 were checked and are gone
  })
  expect(Object.fromEntries(brokenLinks(links, lookup))).toEqual({
    '/documents/1#missing': 'heading',
    '/documents/2#gone': 'heading',
    '/documents/3': 'document',
    '/documents/4#x': 'document',
  })
})

test('a heading without a stored id is matched by its text, like the link that scrolls to it', () => {
  const lookup = linkLookup({ currentId: 1, currentHeadings: [heading('Title'), heading('Intro')], asked: [], found: [] })
  expect(brokenLinks(documentLinksIn(doc(paragraph(link('/documents/1#intro'), link('/documents/1#outro')))), lookup).size).toBe(1)
})

test('a document that has not been checked yet is never marked', () => {
  const lookup = linkLookup({ currentId: 1, currentHeadings: [heading('Title'), heading('Intro', 'intro')], asked: [], found: [] })
  expect([...brokenLinks(links, lookup).keys()]).toEqual(['/documents/1#missing'])
})

test('a link to a whole document that exists is fine, with or without headings', () => {
  const lookup = linkLookup({ currentId: 1, currentHeadings: [], asked: [3], found: [{ id: 3, headings: [] }] })
  expect(brokenLinks(documentLinksIn(doc(paragraph(link('/documents/3')))), lookup).size).toBe(0)
})

test('the messages say what is gone', () => {
  expect(brokenLinkMessage('document')).toMatch(/document/)
  expect(brokenLinkMessage('heading')).toMatch(/heading/)
  expect(BROKEN_LINK_TITLE).toMatch(/Broken link/)
})
