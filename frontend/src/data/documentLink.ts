import type { Folder } from '@/types'
import { lastModified } from './document'
import { searchSpaceFiles, spaceFiles, type SpaceFile } from './folder'

// Links from one document to another (docs/features/document_links.md): an inline
// node holding only the target's id. Typing a trigger opens the picker.

// What typed text opens the picker: two brackets, or an at sign that starts a word.
export type DocumentLinkTrigger = '[[' | '@'
export const DOCUMENT_LINK_TRIGGERS: readonly DocumentLinkTrigger[] = ['[[', '@']

// A trigger the user just typed, and how many characters already in the text
// before the cursor belong to it (the first bracket of "[["; none for "@").
export interface TriggerMatch {
  trigger: DocumentLinkTrigger
  remove: number
}

// Whether typing `typed` after `textBefore` (the text of the block up to the
// cursor) completes one of the `triggers`. "@" only counts at the start of a
// block or after a space, so an email address like "a@b.com" is left alone.
export function documentLinkTrigger(
  textBefore: string,
  typed: string,
  triggers: readonly DocumentLinkTrigger[] = DOCUMENT_LINK_TRIGGERS,
): TriggerMatch | null {
  if (typed === '[' && textBefore.endsWith('[') && triggers.includes('[[')) return { trigger: '[[', remove: 1 }
  if (typed === '@' && (textBefore === '' || /\s$/.test(textBefore)) && triggers.includes('@')) return { trigger: '@', remove: 0 }
  return null
}

// The id stored on a link in saved HTML (`data-document-id`), or null when it isn't a whole number above zero.
export function documentIdFromAttribute(value: string | null): number | null {
  const id = Number(value)
  return value !== null && Number.isInteger(id) && id > 0 ? id : null
}

export const MAX_LINK_MATCHES = 20

// The files to offer in the picker: those whose title or folder contain the
// query, never `excludeId` (the document being edited), and with no query the
// most recently changed first.
export function linkableFiles(folders: Folder[], query: string, excludeId?: number, limit = MAX_LINK_MATCHES): SpaceFile[] {
  const found = searchSpaceFiles(spaceFiles(folders), query).filter((f) => f.document.id !== excludeId)
  const ordered = query.trim() ? found : [...found].sort((a, b) => lastModified(b.document).localeCompare(lastModified(a.document)))
  return ordered.slice(0, limit)
}
