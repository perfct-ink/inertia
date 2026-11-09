import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import type { Editor } from '@tiptap/core'
import { dateIdFromAnchor, findDatePos } from '@/data/documentDate'
import { anchorFromHash } from '@/data/heading'
import { useScrollToTarget, type ScrollTarget } from './useHeadingLinks'

export const MISSING_DATE_MESSAGE = 'That date is no longer in this document.'

// When the address names a date chip (".../documents/12#date%3D34", the link on
// a calendar entry), scrolls the editor to the chip and highlights it for a
// moment (class styled in DocumentDateView.scss). A missing chip tells the user
// and leaves the document where it is.
export function useScrollToDate(editor: Editor | null, ready: boolean) {
  const { hash } = useLocation()
  const dateId = dateIdFromAnchor(anchorFromHash(hash))
  const target = useMemo<ScrollTarget>(() => ({
    find: (doc) => (dateId === null ? null : findDatePos(doc, dateId)),
    flashClass: 'document-date--target',
    missingMessage: MISSING_DATE_MESSAGE,
  }), [dateId])
  useScrollToTarget(editor, ready, dateId !== null, target)
}
