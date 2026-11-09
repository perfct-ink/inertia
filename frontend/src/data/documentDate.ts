import type { DocumentDate } from '@/types'
import { isValidISODate } from '@/util/calendar'
import { documentPath } from './heading'

// What is typed in a document to add a date: "/date " or "@date " (a picker
// opens), or "@2026-12-01 " (that day, no picker), at the start of a line or
// after a space, finished with a space. Group 1 is the character before the
// trigger, group 2 the day when one was typed.
export const DATE_TRIGGER = /(^|\s)(?:\/date|@date|@(\d{4}-\d{2}-\d{2})) $/

// The node a date chip is stored as; its `dateId` attribute is the id of the
// calendar entry (document_dates row) it stands for.
export const DATE_CHIP = 'documentDate'

// The day typed in a trigger, or null when none was typed or it is not a real day.
export function triggerDate(match: RegExpMatchArray): string | null {
  const date = match[2]
  return date && isValidISODate(date) ? date : null
}

const MAX_LABEL = 120

// What a new calendar entry says: the text of the line the date was added to
// (the chip itself has no text), shortened; or the document's title when the
// line is empty.
export function dateLabel(lineText: string, documentTitle: string): string {
  const clip = (text: string) => (text.length > MAX_LABEL ? `${text.slice(0, MAX_LABEL - 1).trimEnd()}…` : text)
  const line = lineText.replace(/\s+/g, ' ').trim()
  return clip(line || documentTitle.replace(/\s+/g, ' ').trim())
}

// The body to POST for a date made in a document (the server files it in the
// document's project).
export function documentDatePayload(date: string, label: string, documentId: number) {
  return { date, label: label.trim(), document_id: documentId }
}

// The text a calendar entry shows: its label, or the document it came from.
export function dateEntryTitle(date: Pick<DocumentDate, 'label' | 'document_title'>): string {
  return date.label.trim() || date.document_title?.trim() || 'Date'
}

// Where in a document a date chip is, as the address's hash: "date=34". Heading
// anchors are only letters, digits and dashes, so the two never collide.
export function dateAnchor(dateId: number): string {
  return `date=${dateId}`
}

// The date a hash anchor points at, or null when it is not a date anchor.
export function dateIdFromAnchor(anchor: string | null): number | null {
  const match = anchor ? /^date=(\d+)$/.exec(anchor) : null
  return match ? Number(match[1]) : null
}

// The in-app path of a calendar entry's chip, or null when the entry was kept
// after its line was deleted (it points at no document).
export function documentDatePath(date: Pick<DocumentDate, 'id' | 'document_id'>): string | null {
  return date.document_id ? documentPath({ documentId: date.document_id, anchor: dateAnchor(date.id) }) : null
}

// What the functions below need of a ProseMirror document (so a test can pass a stand-in).
interface DocWithNodes {
  descendants(visit: (node: { type: { name: string }; attrs: Record<string, unknown> }, pos: number) => boolean | void): void
}

// The ids of the date chips in a document.
export function dateIdsIn(doc: DocWithNodes): Set<number> {
  const found = new Set<number>()
  doc.descendants((node) => {
    if (node.type.name === DATE_CHIP && typeof node.attrs.dateId === 'number') found.add(node.attrs.dateId)
  })
  return found
}

// Date ids that had a chip before the person's edits and have none now, but are
// still linked to this document: chips they deleted, where we should ask what to
// do with the calendar entry. A line moved by cut and paste has its chip again
// by then, so it is not asked about.
export function removedDateIds(before: Set<number>, now: Set<number>, linkedIds: Set<number>): number[] {
  return [...before].filter((id) => !now.has(id) && linkedIds.has(id))
}

// The position of the chip for a calendar entry, or null when the document has none.
export function findDatePos(doc: DocWithNodes, dateId: number): number | null {
  let found: number | null = null
  doc.descendants((node, pos) => {
    if (found !== null) return false
    if (node.type.name === DATE_CHIP && node.attrs.dateId === dateId) found = pos
  })
  return found
}

// What the dialog that asks about removed dates says.
export function removedDatesMessage(dates: Pick<DocumentDate, 'date' | 'label'>[]): string {
  if (dates.length === 1) return `You removed the line with ${dates[0].date}${dates[0].label ? ` (“${dates[0].label}”)` : ''}. Its entry is still on the calendar.`
  return `You removed ${dates.length} dates from this document: ${dates.map((d) => d.date).join(', ')}. Their entries are still on the calendar.`
}
