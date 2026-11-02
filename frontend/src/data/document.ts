import type { Document } from '@/types'

export interface JsonNode { type?: string; text?: string; attrs?: Record<string, unknown>; content?: JsonNode[] }

// A document always starts with a heading; its text is the document title.
export function extractTitle(json: Record<string, unknown>): string {
  const first = (json.content as JsonNode[] | undefined)?.[0]
  if (first?.type === 'heading') {
    return first.content?.map((n) => n.text ?? '').join('').trim() || 'Untitled'
  }
  return 'Untitled'
}

// The content of a new document: a level-1 heading (the title) and an empty paragraph.
export function buildInitialContent(title: string): Record<string, unknown> {
  return {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: title ? [{ type: 'text', text: title }] : [],
      },
      { type: 'paragraph' },
    ],
  }
}

// When the document's content (not just its metadata) last changed.
export function lastModified(doc: Document): string {
  return doc.content_updated_at ?? doc.updated_at
}

// What people call each kind of document in labels and new titles.
export const DOC_TYPE_LABELS: Record<Document['doc_type'], string> = {
  document: 'Document',
  spreadsheet: 'Sheet',
  table: 'Collection',
  file: 'File',
}

export function untitledTitle(type: Document['doc_type']): string {
  return `Untitled ${DOC_TYPE_LABELS[type]}`
}

// A task list holding one task line with `text`; the document's task sync
// turns the line into a Space task linked to the document (document_task_lines.md).
export function taskListContent(text: string): Record<string, unknown> {
  return {
    type: 'workspaceTaskList',
    content: [{ type: 'workspaceTaskItem', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] }],
  }
}

// The text to make a task of: the selection collapsed to one line, or null when
// it is empty.
export function selectionTaskTitle(selected: string): string | null {
  const title = selected.replace(/\s+/g, ' ').trim()
  return title || null
}

// How a file is shown: an image, a video, a PDF, or just a download.
export type FilePreview = 'image' | 'video' | 'pdf' | 'none'

export function filePreview(contentType: string | undefined): FilePreview {
  if (!contentType) return 'none'
  if (contentType.startsWith('image/') && contentType !== 'image/svg+xml') return 'image'
  if (contentType.startsWith('video/')) return 'video'
  if (contentType === 'application/pdf') return 'pdf'
  return 'none'
}

// One byte formatter for the app (shared with embedded attachments).
export { formatBytes } from './attachment'

export type GalleryFilter = 'all' | 'image' | 'video' | 'pdf' | 'other'

// The files of a Space, narrowed to one kind (images, videos, PDFs or everything
// else), newest first. Documents that aren't uploaded files are left out.
export function galleryFiles(documents: Document[], filter: GalleryFilter): Document[] {
  return documents
    .filter((d) => d.doc_type === 'file')
    .filter((d) => {
      const kind = filePreview(d.file?.content_type)
      return filter === 'all' || (filter === 'other' ? kind === 'none' : kind === filter)
    })
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.title.localeCompare(b.title))
}
// A heading in a document, for the outline: its level (1-6), text and position in the editor.
export interface OutlineHeading { level: number; text: string; pos: number }

// The heading the cursor is under: the last one at or before `selectionPos`, or
// the first when the cursor is above them all; -1 when there are none.
export function activeHeadingIndex(headings: OutlineHeading[], selectionPos: number): number {
  if (headings.length === 0) return -1
  let active = 0
  headings.forEach((h, i) => { if (h.pos <= selectionPos) active = i })
  return active
}
