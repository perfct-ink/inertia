import type { Document } from '@/types'

interface JsonNode { type?: string; text?: string; content?: JsonNode[] }

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

// How a file is shown: an image, a video, a PDF, or just a download.
export type FilePreview = 'image' | 'video' | 'pdf' | 'none'

export function filePreview(contentType: string | undefined): FilePreview {
  if (!contentType) return 'none'
  if (contentType.startsWith('image/') && contentType !== 'image/svg+xml') return 'image'
  if (contentType.startsWith('video/')) return 'video'
  if (contentType === 'application/pdf') return 'pdf'
  return 'none'
}

// "512 B", "3.4 KB", "12.1 MB".
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i++ }
  return `${value.toFixed(1)} ${units[i]}`
}
