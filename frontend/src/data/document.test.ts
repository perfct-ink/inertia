import type { Document } from '@/types'
import { buildInitialContent, extractTitle, filePreview, galleryFiles, storageLabel, storagePercent, lastModified, selectionTaskTitle, taskListContent, DOC_TYPE_LABELS, activeHeadingIndex, GALLERY_FILTERS } from './document'

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

test('selectionTaskTitle collapses whitespace and rejects an empty selection', () => {
  expect(selectionTaskTitle('  Users can\n  export   a report ')).toBe('Users can export a report')
  expect(selectionTaskTitle('   \n ')).toBeNull()
})

test('taskListContent is a task list with one task line holding the text', () => {
  expect(taskListContent('Export a report')).toEqual({
    type: 'workspaceTaskList',
    content: [{ type: 'workspaceTaskItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Export a report' }] }] }],
  })
})

test('filePreview picks how to show a file (SVG is downloaded, not rendered inline)', () => {
  expect(filePreview('image/png')).toBe('image')
  expect(filePreview('image/svg+xml')).toBe('none')
  expect(filePreview('video/mp4')).toBe('video')
  expect(filePreview('application/pdf')).toBe('pdf')
  expect(filePreview('application/zip')).toBe('none')
  expect(filePreview(undefined)).toBe('none')
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
test('activeHeadingIndex is the last heading at or before the cursor', () => {
  const headings = [{ level: 1, text: 'A', pos: 0 }, { level: 2, text: 'B', pos: 20 }, { level: 2, text: 'C', pos: 50 }]
  expect(activeHeadingIndex(headings, 0)).toBe(0)
  expect(activeHeadingIndex(headings, 25)).toBe(1)
  expect(activeHeadingIndex(headings, 50)).toBe(2)
  expect(activeHeadingIndex(headings, 999)).toBe(2)
  expect(activeHeadingIndex([], 5)).toBe(-1)
})

test('the gallery filters cover every kind galleryFiles understands, All first', () => {
  expect(GALLERY_FILTERS.map((f) => f.value)).toEqual(['all', 'image', 'video', 'pdf', 'other'])
})

test('storage reads as used of limit, with a capped percentage', () => {
  expect(storageLabel({ used: 120 * 1024 * 1024, limit: 1024 ** 3 })).toBe('120 MB of 1 GB used')
  expect(storageLabel(undefined)).toBeNull()
  expect(storagePercent({ used: 512, limit: 1024 })).toBe(50)
  expect(storagePercent({ used: 2048, limit: 1024 })).toBe(100)
  expect(storagePercent({ used: 0, limit: 0 })).toBe(100)
})
