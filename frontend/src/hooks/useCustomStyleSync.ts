import { useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { useQueryClient } from '@tanstack/react-query'
import { fetchParagraphStyles, useParagraphStyles } from '@/api/paragraphStyles'
import { useAuthStore } from '@/store/auth'
import { refreshCustomParagraphStyles, styleRefreshes } from '@/util/customParagraphStyleCommand'

// A burst of typing or syncing checks the document once, not on every change.
const CHECK_DELAY_MS = 500

// Keeps the copies of the signed-in person's custom styles in the open document
// current. A paragraph carries a copy of its style (data/customParagraphStyle.ts),
// so when the person edits a style the paragraphs in the documents they open take
// on the new formatting, and when they delete one those paragraphs become Body.
// Only the style's owner does this; everyone else sees the last copy. It runs when
// the document opens and fills in, when the person's style list changes, and as the
// document changes (a paste can bring in an old copy).
//
// Rewriting a document is never done on a cached list, which can be out of date (a
// style made in another tab would look deleted): when the cached list says
// something is out of date, the list is fetched again and the fresh one decides.
// Nothing is touched while the list hasn't loaded, or in a document that can't be edited.
export function useCustomStyleSync(editor: Editor | null) {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  const { data: styles } = useParagraphStyles()

  useEffect(() => {
    if (!editor || userId === undefined || !styles) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopped = false

    const check = async () => {
      if (stopped || editor.isDestroyed || !editor.isEditable) return
      if (styleRefreshes(editor.state.doc, styles, userId).length === 0) return
      try {
        const fresh = await fetchParagraphStyles(queryClient)
        if (!stopped && !editor.isDestroyed && editor.isEditable) refreshCustomParagraphStyles(editor, fresh, userId)
      } catch {
        // The API client has already shown the error; the document is left as it is.
      }
    }
    const onUpdate = () => {
      clearTimeout(timer)
      timer = setTimeout(check, CHECK_DELAY_MS)
    }

    check()
    editor.on('update', onUpdate)
    return () => {
      stopped = true
      clearTimeout(timer)
      editor.off('update', onUpdate)
    }
  }, [editor, styles, userId, queryClient])
}
