import { PARAGRAPH_STYLES, styleById, styleOfBlock } from './paragraphStyle'

test('offers Title, Subtitle, Heading 1-3, Body, Quote, Caption and Monospace once each', () => {
  expect(PARAGRAPH_STYLES.map((s) => s.label)).toEqual(['Title', 'Subtitle', 'Heading 1', 'Heading 2', 'Heading 3', 'Body', 'Quote', 'Caption', 'Monospace'])
  expect(new Set(PARAGRAPH_STYLES.map((s) => s.id)).size).toBe(PARAGRAPH_STYLES.length)
})

test('every style is a heading level or a paragraph style, not both', () => {
  for (const style of PARAGRAPH_STYLES) expect(Boolean(style.heading) !== Boolean(style.paragraphStyle)).toBe(true)
})

test('styleOfBlock reads headings 1-3 and paragraph styles, defaulting plain paragraphs to body', () => {
  expect(styleOfBlock('heading', { level: 2 })).toBe('heading2')
  expect(styleOfBlock('heading', { level: 5 })).toBeNull()
  expect(styleOfBlock('paragraph', {})).toBe('body')
  expect(styleOfBlock('paragraph', { style: null })).toBe('body')
  expect(styleOfBlock('paragraph', { style: 'quote' })).toBe('quote')
  expect(styleOfBlock('paragraph', { style: 'unknown' })).toBe('body')
  expect(styleOfBlock('bulletList', {})).toBeNull()
})

test('styleById finds a style', () => {
  expect(styleById('caption').paragraphStyle).toBe('caption')
})
