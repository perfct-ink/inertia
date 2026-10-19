import type { Document } from '@/types'
import { activeHeadingIndex, buildInitialContent, extractTitle, lastModified, DOC_TYPE_LABELS } from './document'

test('extractTitle reads the leading heading', () => {
  expect(extractTitle(buildInitialContent('Launch plan'))).toBe('Launch plan')
})

test('extractTitle falls back to Untitled', () => {
  expect(extractTitle({ content: [{ type: 'paragraph' }] })).toBe('Untitled')
  expect(extractTitle(buildInitialContent(''))).toBe('Untitled')
  expect(extractTitle({})).toBe('Untitled')
})

test('lastModified prefers the content timestamp', () => {
  expect(lastModified({ content_updated_at: '2026-02-01', updated_at: '2026-03-01' } as Document)).toBe('2026-02-01')
  expect(lastModified({ content_updated_at: null, updated_at: '2026-03-01' } as Document)).toBe('2026-03-01')
})

test('users see tables as Collections', () => {
  expect(DOC_TYPE_LABELS.table).toBe('Collection')
})

test('activeHeadingIndex is the last heading at or before the cursor', () => {
  const headings = [{ level: 1, text: 'A', pos: 0 }, { level: 2, text: 'B', pos: 20 }, { level: 2, text: 'C', pos: 50 }]
  expect(activeHeadingIndex(headings, 0)).toBe(0)
  expect(activeHeadingIndex(headings, 25)).toBe(1)
  expect(activeHeadingIndex(headings, 50)).toBe(2)
  expect(activeHeadingIndex(headings, 999)).toBe(2)
  expect(activeHeadingIndex([], 5)).toBe(-1)
})
