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
