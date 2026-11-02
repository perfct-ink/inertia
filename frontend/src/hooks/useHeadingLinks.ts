import { useCallback, useEffect, type MouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Editor } from '@tiptap/core'
import { anchorFromHash, documentPath, parseDocumentHref } from '@/data/heading'
import { findHeadingPos } from '@/extensions/HeadingAnchor'
import { useNotificationStore } from '@/store/notifications'

// How long the heading a link landed on stays highlighted (class styled in DocumentScreen.scss).
const FLASH_MS = 2000
// How long to wait for a collaborative document to arrive before saying the heading is gone.
const GIVE_UP_MS = 6000
const FLASH_CLASS = 'document-heading--target'

export const MISSING_HEADING_MESSAGE = 'That heading is no longer in this document.'

// When the address has a heading (".../documents/12#launch-plan"), scrolls the
// editor to that heading and highlights it. A collaborative document fills in
// after it opens, so this waits for the heading to show up; if it never does
// (it was deleted) the user is told. Pass `ready` once the editor is on screen.
export function useScrollToHeading(editor: Editor | null, ready: boolean) {
  const { hash, key } = useLocation()

  useEffect(() => {
    const anchor = anchorFromHash(hash)
    if (!editor || !ready || !anchor) return
    let flashed: HTMLElement | null = null
    let flashTimer: number | undefined
    let giveUpTimer: number | undefined

    const show = (): boolean => {
      const pos = findHeadingPos(editor.state.doc, anchor)
      const dom = pos === null ? null : editor.view.nodeDOM(pos)
      if (!(dom instanceof HTMLElement) || !dom.isConnected) return false
      dom.scrollIntoView({ block: 'start' })
      dom.classList.add(FLASH_CLASS)
      flashed = dom
      flashTimer = window.setTimeout(() => dom.classList.remove(FLASH_CLASS), FLASH_MS)
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
        if (!show()) useNotificationStore.getState().notify(MISSING_HEADING_MESSAGE)
      }, GIVE_UP_MS)
    }
    return () => {
      stopWaiting()
      window.clearTimeout(flashTimer)
      flashed?.classList.remove(FLASH_CLASS)
    }
    // `key` changes on every navigation, so following the same link again scrolls again.
  }, [editor, ready, hash, key])
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
