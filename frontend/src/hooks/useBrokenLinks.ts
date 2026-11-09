import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import type { Editor } from '@tiptap/core'
import { useDocumentLinkTargets } from '@/api/documents'
import {
  brokenLinks, documentLinksIn, linkedDocumentIds, linkLookup,
  type BrokenReason, type DocumentLink,
} from '@/data/brokenLink'
import type { JsonNode } from '@/data/document'
import { headingsOf, type HeadingInfo, type HeadingLink } from '@/data/heading'
import { linkRangeAt, relinkTo, removeLinkAt, setBrokenLinks, type LinkRange } from '@/extensions/BrokenLinks'
import { useNotificationStore } from '@/store/notifications'

// How long the document must be still before its links are looked at again.
const SETTLE_MS = 300

export const LINK_CHANGED_MESSAGE = 'That link changed, so nothing was done.'

// A broken link in the editor: where it is, its text, and what is wrong with it.
export interface BrokenLink extends LinkRange {
  href: string
  reason: BrokenReason
}

interface Scan {
  links: DocumentLink[]
  headings: HeadingInfo[]
}

const NOTHING: Scan = { links: [], headings: [] }

// Marks the links in the open document whose target document or heading was
// deleted (see data/brokenLink.ts), and finds the broken link under a click or
// the caret. The open document's own headings come from the editor; the other
// documents it links to are checked with one request for all of them, repeated
// only when the set of linked documents changes. Pass `ready` once the editor
// holds the document (a collaborative one fills in after it opens), so a link to
// a heading in the document itself is not called broken while it is still empty.
export function useBrokenLinks(editor: Editor | null, documentId: number, ready: boolean) {
  const [scan, setScan] = useState<Scan>(NOTHING)
  const lastScan = useRef('')

  useEffect(() => {
    if (!editor || !ready) {
      lastScan.current = ''
      setScan(NOTHING)
      return
    }
    let timer: number | undefined
    const rescan = () => {
      const json = editor.getJSON() as JsonNode
      const next: Scan = { links: documentLinksIn(json, window.location.origin), headings: headingsOf(json as Record<string, unknown>) }
      const signature = JSON.stringify(next)
      if (signature === lastScan.current) return
      lastScan.current = signature
      setScan(next)
    }
    const onUpdate = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(rescan, SETTLE_MS)
    }
    rescan()
    editor.on('update', onUpdate)
    return () => {
      editor.off('update', onUpdate)
      window.clearTimeout(timer)
    }
  }, [editor, ready])

  const ids = useMemo(() => linkedDocumentIds(scan.links, documentId), [scan.links, documentId])
  const targets = useDocumentLinkTargets(ids)

  const broken = useMemo(() => {
    const lookup = linkLookup({
      currentId: documentId,
      currentHeadings: scan.headings,
      asked: targets.data?.asked ?? [],
      found: targets.data?.found ?? [],
    })
    return brokenLinks(scan.links, lookup)
  }, [documentId, scan, targets.data])

  useEffect(() => {
    if (editor) setBrokenLinks(editor, new Set(broken.keys()))
  }, [editor, broken])

  const describe = useCallback((pos: number, href: string, reason: BrokenReason): BrokenLink | null => {
    const range = editor ? linkRangeAt(editor, pos, href) : null
    return range ? { ...range, href, reason } : null
  }, [editor])

  // The broken link a click landed on, or null when it was not on one.
  const fromClick = useCallback((event: MouseEvent): BrokenLink | null => {
    if (!editor || event.button !== 0 || broken.size === 0) return null
    const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
    const href = anchor?.getAttribute('href') ?? ''
    const reason = broken.get(href)
    if (!anchor || !reason || !editor.view.dom.contains(anchor)) return null
    try {
      return describe(editor.view.posAtDOM(anchor, 0), href, reason)
    } catch {
      return null
    }
  }, [editor, broken, describe])

  // The broken link the caret is in, or null, for reaching the fix by keyboard.
  const atCaret = useCallback((): BrokenLink | null => {
    if (!editor || broken.size === 0 || !editor.isActive('link')) return null
    const href = editor.getAttributes('link').href
    const reason = typeof href === 'string' ? broken.get(href) : undefined
    return reason ? describe(editor.state.selection.from, href, reason) : null
  }, [editor, broken, describe])

  return { broken, fromClick, atCaret }
}

// "Remove link": keeps the text, drops the link. If the document changed under
// the dialog and the link is no longer there, nothing is touched.
export function removeBrokenLink(editor: Editor, link: BrokenLink): void {
  const range = linkRangeAt(editor, link.from, link.href)
  if (range) removeLinkAt(editor, range)
  else useNotificationStore.getState().notify(LINK_CHANGED_MESSAGE)
}

// "Pick a new target": points the link at the heading picked, keeping its text.
export function relinkBrokenLink(editor: Editor, link: BrokenLink, picked: HeadingLink): void {
  const range = linkRangeAt(editor, link.from, link.href)
  if (range) relinkTo(editor, range, picked)
  else useNotificationStore.getState().notify(LINK_CHANGED_MESSAGE)
}
