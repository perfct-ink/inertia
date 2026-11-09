import { useCallback, useEffect, useMemo, type MouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Editor } from '@tiptap/core'
import { dateIdFromAnchor } from '@/data/documentDate'
import { anchorFromHash, documentPath, parseDocumentHref } from '@/data/heading'
import { findHeadingPos } from '@/extensions/HeadingAnchor'
import { useNotificationStore } from '@/store/notifications'

// How long the heading a link landed on stays highlighted (class styled in DocumentScreen.scss).
const FLASH_MS = 2000
// How long to wait for a collaborative document to arrive before saying the heading is gone.
const GIVE_UP_MS = 6000
const FLASH_CLASS = 'document-heading--target'

export const MISSING_HEADING_MESSAGE = 'That heading is no longer in this document.'

// Where a link points in the document: how to find its position (null while it
// is not there), the class that highlights it for a moment, and what to say when
// it never turns up. Headings are one kind of target, date chips another.
export interface ScrollTarget {
  find: (doc: Editor['state']['doc']) => number | null
  flashClass: string
  missingMessage: string
}

// Scrolls the editor to `target` and highlights it, when the address has one
// (`hasTarget`). A collaborative document fills in after it opens, so this waits
// for the target to show up; if it never does (it was deleted) the user is told.
// Pass `ready` once the editor is on screen. `target` must be stable between
// renders (memoize it) or the scroll repeats.
export function useScrollToTarget(editor: Editor | null, ready: boolean, hasTarget: boolean, target: ScrollTarget) {
  const { hash, key } = useLocation()

  useEffect(() => {
    if (!editor || !ready || !hasTarget) return
    let flashed: HTMLElement | null = null
    let flashTimer: number | undefined
    let giveUpTimer: number | undefined

    const show = (): boolean => {
      const pos = target.find(editor.state.doc)
      const dom = pos === null ? null : editor.view.nodeDOM(pos)
      if (!(dom instanceof HTMLElement) || !dom.isConnected) return false
      dom.scrollIntoView({ block: 'start' })
      dom.classList.add(target.flashClass)
      flashed = dom
      flashTimer = window.setTimeout(() => dom.classList.remove(target.flashClass), FLASH_MS)
      return true
    }
    const stopWaiting = () => {
      editor.off('update', onUpdate)
      window.clearTimeout(giveUpTimer)
    }
    function onUpdate() {
      if (show()) stopWaiting()
    }

    if (!show()) {
      editor.on('update', onUpdate)
      giveUpTimer = window.setTimeout(() => {
        stopWaiting()
        if (!show()) useNotificationStore.getState().notify(target.missingMessage)
      }, GIVE_UP_MS)
    }
    return () => {
      stopWaiting()
      window.clearTimeout(flashTimer)
      flashed?.classList.remove(target.flashClass)
    }
    // `key` changes on every navigation, so following the same link again scrolls again.
  }, [editor, ready, hasTarget, target, hash, key])
}

// When the address has a heading (".../documents/12#launch-plan"), scrolls the
// editor to that heading and highlights it (see useScrollToTarget).
export function useScrollToHeading(editor: Editor | null, ready: boolean) {
  const { hash } = useLocation()
  const anchor = anchorFromHash(hash)
  // A date anchor ("#date=34") belongs to useScrollToDate, not to a heading.
  const heading = anchor !== null && dateIdFromAnchor(anchor) === null ? anchor : null
  const target = useMemo<ScrollTarget>(() => ({
    find: (doc) => (heading === null ? null : findHeadingPos(doc, heading)),
    flashClass: FLASH_CLASS,
    missingMessage: MISSING_HEADING_MESSAGE,
  }), [heading])
  useScrollToTarget(editor, ready, heading !== null, target)
}

// A click handler that opens links to documents in this app (a heading link, or a
// plain "/documents/12") without leaving the single-page app. It returns true when
// it handled the click; other links, and clicks with a modifier key, are left alone.
export function useFollowDocumentLinks(): (event: MouseEvent) => boolean {
  const navigate = useNavigate()
  return useCallback((event: MouseEvent): boolean => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null
    const target = link && parseDocumentHref(link.getAttribute('href') ?? '', window.location.origin)
    if (!target) return false
    event.preventDefault()
    navigate(documentPath(target))
    return true
  }, [navigate])
}
