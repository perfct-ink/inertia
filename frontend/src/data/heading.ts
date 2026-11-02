import type { JsonNode } from './document'

// Stable anchors for a document's headings, so a link can point at one
// ("#launch-plan") and keep working when the heading is edited or moved.
// The editor stores an `id` on each heading once and never changes it; until
// a heading has one (older documents, or text typed a moment ago) its anchor is
// computed from its text by the same rules, so the two agree.

// A heading as it sits in a document: the id stored on it (null until one is
// assigned), its text and its level (1-6).
export interface HeadingInfo {
  id: string | null
  text: string
  level: number
}

// What a link can point at.
export interface HeadingTarget {
  anchor: string
  text: string
  level: number
}

// A heading chosen to link to: where it is, and its text for the link label.
export interface HeadingLink {
  documentId: number
  anchor: string
  text: string
}

// Where a link inside the app goes: a document, and optionally a heading in it.
export interface DocumentTarget {
  documentId: number
  anchor: string | null
}

const MAX_SLUG_LENGTH = 48

// "Launch plan: Q3!" becomes "launch-plan-q3". Accents are dropped and other
// scripts kept; the result is '' when no letters or digits are left.
export function slugify(text: string): string {
  const slug = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return Array.from(slug).slice(0, MAX_SLUG_LENGTH).join('').replace(/-+$/, '')
}

// The anchor of each heading, in document order, or null for a heading with no
// id and no text. A stored id wins; a repeated id (a pasted copy of a heading)
// or a missing one gets the slug of its text, numbered "-2", "-3" when taken.
export function anchorsFor(headings: Pick<HeadingInfo, 'id' | 'text'>[]): (string | null)[] {
  const taken = new Set<string>()
  const stored = headings.map((h) => {
    if (!h.id || taken.has(h.id)) return null
    taken.add(h.id)
    return h.id
  })
  return headings.map((h, i) => {
    const kept = stored[i]
    if (kept) return kept
    const base = slugify(h.text)
    if (!base) return null
    let anchor = base
    for (let n = 2; taken.has(anchor); n += 1) anchor = `${base}-${n}`
    taken.add(anchor)
    return anchor
  })
}

// The id to store on each heading that needs one (null: leave it alone), so
// every heading with text ends up with a unique, permanent id.
export function idsToStore(headings: HeadingInfo[]): (string | null)[] {
  return anchorsFor(headings).map((anchor, i) => (anchor && anchor !== headings[i].id ? anchor : null))
}

// The position in `headings` that `anchor` points at, or -1 when none does.
export function indexOfAnchor(headings: HeadingInfo[], anchor: string): number {
  return anchorsFor(headings).indexOf(anchor)
}

function textOf(node: JsonNode): string {
  if (node.type === 'hardBreak') return ' '
  return node.text ?? (node.content ?? []).map(textOf).join('')
}

// Every heading in saved document content (editor JSON), in document order.
export function headingsOf(content: Record<string, unknown> | null | undefined): HeadingInfo[] {
  const found: HeadingInfo[] = []
  const walk = (node: JsonNode) => {
    if (node.type === 'heading') {
      const id = node.attrs?.id
      found.push({
        id: typeof id === 'string' && id ? id : null,
        text: textOf(node).trim(),
        level: Number(node.attrs?.level) || 1,
      })
      return
    }
    node.content?.forEach(walk)
  }
  if (content) walk(content as JsonNode)
  return found
}

// The headings a link can point at: all but the first (the title, which is the
// document itself) and any with no text.
export function linkableHeadings(content: Record<string, unknown> | null | undefined): HeadingTarget[] {
  const headings = headingsOf(content)
  const anchors = anchorsFor(headings)
  return headings.flatMap((h, i) => {
    const anchor = anchors[i]
    return i > 0 && anchor ? [{ anchor, text: h.text, level: h.level }] : []
  })
}

function decode(part: string): string {
  try {
    return decodeURIComponent(part)
  } catch {
    return part
  }
}

// The anchor in a location hash ("#launch-plan"), or null for no hash.
export function anchorFromHash(hash: string): string | null {
  const anchor = decode(hash.replace(/^#/, ''))
  return anchor || null
}

// The in-app path for a document, or for a heading in it: "/documents/12#launch-plan".
export function documentPath({ documentId, anchor }: DocumentTarget): string {
  return `/documents/${documentId}${anchor ? `#${encodeURIComponent(anchor)}` : ''}`
}

// Reads a link's href as an in-app document link, or null when it points elsewhere.
// Accepts the path ("/documents/12#intro"), the router's hash form
// ("#/documents/12#intro") and either of them behind this app's own `origin`.
export function parseDocumentHref(href: string, origin = ''): DocumentTarget | null {
  const local = origin && href.startsWith(origin) ? href.slice(origin.length) : href
  const match = /^(?:\/?#)?\/documents\/(\d+)(?:#([^#]*))?$/.exec(local)
  if (!match) return null
  return { documentId: Number(match[1]), anchor: match[2] ? decode(match[2]) : null }
}
