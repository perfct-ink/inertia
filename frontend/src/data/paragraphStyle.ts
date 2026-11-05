// The paragraph styles every document offers. A style is either a heading level
// or a named look stored on a paragraph (its `style` attribute); "body" is the
// plain paragraph. Mirrored in collab-server/src/schema.ts (the paragraph attribute).
export type ParagraphStyleId = 'title' | 'subtitle' | 'heading1' | 'heading2' | 'heading3' | 'body' | 'quote' | 'caption' | 'monospace'

export interface ParagraphStyle {
  id: ParagraphStyleId
  label: string
  // Headings are heading nodes of this level; everything else is a paragraph with this style value.
  heading?: 1 | 2 | 3
  paragraphStyle?: 'title' | 'subtitle' | 'body' | 'quote' | 'caption' | 'monospace'
}

export const PARAGRAPH_STYLES: ParagraphStyle[] = [
  { id: 'title', label: 'Title', paragraphStyle: 'title' },
  { id: 'subtitle', label: 'Subtitle', paragraphStyle: 'subtitle' },
  { id: 'heading1', label: 'Heading 1', heading: 1 },
  { id: 'heading2', label: 'Heading 2', heading: 2 },
  { id: 'heading3', label: 'Heading 3', heading: 3 },
  { id: 'body', label: 'Body', paragraphStyle: 'body' },
  { id: 'quote', label: 'Quote', paragraphStyle: 'quote' },
  { id: 'caption', label: 'Caption', paragraphStyle: 'caption' },
  { id: 'monospace', label: 'Monospace', paragraphStyle: 'monospace' },
]

// The style a block currently has, or null for blocks that aren't styled
// paragraphs or headings 1 to 3 (lists, code blocks, deeper headings...).
export function styleOfBlock(typeName: string, attrs: { level?: number; style?: string | null }): ParagraphStyleId | null {
  if (typeName === 'heading') {
    const match = PARAGRAPH_STYLES.find((s) => s.heading === attrs.level)
    return match ? match.id : null
  }
  if (typeName === 'paragraph') {
    return PARAGRAPH_STYLES.find((s) => s.paragraphStyle === (attrs.style ?? 'body'))?.id ?? 'body'
  }
  return null
}

export function styleById(id: ParagraphStyleId): ParagraphStyle {
  return PARAGRAPH_STYLES.find((s) => s.id === id) as ParagraphStyle
}
