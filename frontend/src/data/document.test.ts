import type { Document } from '@/types'
import { buildInitialContent, extractTitle, filePreview, formatBytes, lastModified, DOC_TYPE_LABELS } from './document'

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

test('filePreview picks how to show a file (SVG is downloaded, not rendered inline)', () => {
  expect(filePreview('image/png')).toBe('image')
  expect(filePreview('image/svg+xml')).toBe('none')
  expect(filePreview('video/mp4')).toBe('video')
  expect(filePreview('application/pdf')).toBe('pdf')
  expect(filePreview('application/zip')).toBe('none')
  expect(filePreview(undefined)).toBe('none')
})

test('formatBytes uses the largest sensible unit', () => {
  expect(formatBytes(512)).toBe('512 B')
  expect(formatBytes(3482)).toBe('3.4 KB')
  expect(formatBytes(12.1 * 1024 * 1024)).toBe('12.1 MB')
  expect(formatBytes(5 * 1024 ** 3)).toBe('5.0 GB')
})
