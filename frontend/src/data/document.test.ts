import type { Document } from '@/types'
import { buildInitialContent, extractTitle, filePreview, formatBytes, galleryFiles, lastModified, DOC_TYPE_LABELS } from './document'

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

test('galleryFiles keeps uploaded files only, filters by kind and lists the newest first', () => {
  const file = (id: number, title: string, content_type: string, updated_at: string) =>
    ({ id, title, doc_type: 'file', updated_at, file: { url: '/x', filename: title, content_type, byte_size: 1 } }) as unknown as Document
  const docs = [
    file(1, 'a.png', 'image/png', '2026-10-01T00:00:00Z'), file(2, 'b.pdf', 'application/pdf', '2026-10-03T00:00:00Z'),
    file(3, 'c.zip', 'application/zip', '2026-10-02T00:00:00Z'), file(4, 'd.mp4', 'video/mp4', '2026-10-04T00:00:00Z'),
    { id: 5, title: 'Notes', doc_type: 'document', updated_at: '2026-10-05T00:00:00Z' } as unknown as Document,
  ]
  expect(galleryFiles(docs, 'all').map((d) => d.id)).toEqual([4, 2, 3, 1])
  expect(galleryFiles(docs, 'image').map((d) => d.id)).toEqual([1])
  expect(galleryFiles(docs, 'video').map((d) => d.id)).toEqual([4])
  expect(galleryFiles(docs, 'pdf').map((d) => d.id)).toEqual([2])
  expect(galleryFiles(docs, 'other').map((d) => d.id)).toEqual([3])
})
