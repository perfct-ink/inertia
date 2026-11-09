import type { JsonNode } from './document'
import { indexOfAnchor, parseDocumentHref, type DocumentTarget, type HeadingInfo } from './heading'

// Links inside a document that point at another document, or at a heading in
// one, can break: the document is deleted, or the heading is. These are the
// rules for telling which links are broken, from what the editor holds (the open
// document's own headings) and what the server says about the others
// (GET /api/v1/documents/link_targets). A link is only called broken when we
// know: a document that has not been checked yet is never marked.

// What is wrong with a link: its document is gone, or the document is there but
// the heading it points at is not.
export type BrokenReason = 'document' | 'heading'

// An in-app link in a document: its href as stored, and where it points.
export interface DocumentLink {
  href: string
  target: DocumentTarget
}

// What is known about the documents linked to: which ones were checked, and the
// headings of those that exist. A checked document with no entry in `headings`
// does not exist.
export interface LinkLookup {
  checked: ReadonlySet<number>
  headings: ReadonlyMap<number, HeadingInfo[]>
}

// The tooltip on a broken link's text.
export const BROKEN_LINK_TITLE = 'Broken link. Click to fix it.'

// Every distinct in-app document link (one per href) in a document's editor JSON.
export function documentLinksIn(content: JsonNode, origin = ''): DocumentLink[] {
  const found = new Map<string, DocumentLink>()
  const walk = (node: JsonNode) => {
    const href = node.marks?.find((mark) => mark.type === 'link')?.attrs?.href
    if (typeof href === 'string' && !found.has(href)) {
      const target = parseDocumentHref(href, origin)
      if (target) found.set(href, { href, target })
    }
    node.content?.forEach(walk)
  }
  walk(content)
  return [...found.values()]
}

// The documents the links point at, other than `exceptId` (the open document,
// which the editor can answer for itself), once each and in order, so the same
// set always makes the same request.
export function linkedDocumentIds(links: DocumentLink[], exceptId: number): number[] {
  const ids = new Set(links.map((link) => link.target.documentId))
  ids.delete(exceptId)
  return [...ids].sort((a, b) => a - b)
}

// What is known when `asked` documents were checked with the server, `found`
// being the ones that exist, and the open document is read from the editor.
export function linkLookup({ currentId, currentHeadings, asked, found }: {
  currentId: number
  currentHeadings: HeadingInfo[]
  asked: readonly number[]
  found: readonly { id: number; headings: HeadingInfo[] }[]
}): LinkLookup {
  const headings = new Map<number, HeadingInfo[]>(found.map((target) => [target.id, target.headings]))
  headings.set(currentId, currentHeadings)
  return { checked: new Set([...asked, currentId]), headings }
}

// The links that are broken, by href, with what is wrong with each.
export function brokenLinks(links: DocumentLink[], lookup: LinkLookup): Map<string, BrokenReason> {
  const broken = new Map<string, BrokenReason>()
  for (const { href, target } of links) {
    if (!lookup.checked.has(target.documentId)) continue
    const headings = lookup.headings.get(target.documentId)
    if (!headings) broken.set(href, 'document')
    else if (target.anchor && indexOfAnchor(headings, target.anchor) === -1) broken.set(href, 'heading')
  }
  return broken
}

// One inline piece of a text block (a run of text, an image...): how many
// positions it takes up and the href of the link it carries, null for none.
export interface InlineRun {
  size: number
  href: string | null
}

// Where the link with `href` that touches `offset` starts and ends, as offsets
// into the block the runs came from, or null when no such link is there. Runs
// that carry the same href side by side (bold text inside a link) are one link;
// a different href next to it is another link. The editor's own mark range finder
// treats any two adjacent links as one and can miss a link when the position is
// at its very start, so the editor asks this instead.
export function linkSpanAt(runs: readonly InlineRun[], offset: number, href: string): { from: number; to: number } | null {
  let at = 0
  let span: { from: number; to: number } | null = null
  const touches = () => span !== null && offset >= span.from && offset <= span.to
  for (const run of runs) {
    const end = at + run.size
    if (run.href === href) {
      span = { from: span ? span.from : at, to: end }
    } else {
      if (touches()) return span
      span = null
    }
    at = end
  }
  return touches() ? span : null
}

// What the dialog tells the user about a broken link.
export function brokenLinkMessage(reason: BrokenReason): string {
  return reason === 'document'
    ? 'The document this link points to was deleted, or you can no longer open it.'
    : 'The heading this link points to is no longer in its document.'
}
