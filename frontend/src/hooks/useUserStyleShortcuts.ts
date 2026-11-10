import { useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { useParagraphStyleShortcuts } from '@/api/paragraphStyleShortcuts'
import { useParagraphStyles } from '@/api/paragraphStyles'
import { useAuthStore } from '@/store/auth'
import { customStyleKey } from '@/data/customParagraphStyle'
import { eventIsChord } from '@/data/paragraphStyleShortcut'
import { PARAGRAPH_STYLES } from '@/data/paragraphStyle'
import { applyCustomParagraphStyle } from '@/util/customParagraphStyleCommand'
import { applyParagraphStyle } from '@/util/paragraphStyleCommand'
import { isMac } from '@/util/platform'
import { setStyleChordHandler } from '@/extensions/ParagraphStyleUserShortcuts'

// Gives the open document the signed-in person's own style keystrokes: the one
// handler ParagraphStyleUserShortcuts holds is replaced whenever their keystrokes or
// styles change. A chord whose style is gone (a deleted custom style) does nothing.
export function useUserStyleShortcuts(editor: Editor | null) {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const { data: shortcuts = [] } = useParagraphStyleShortcuts()
  const { data: styles = [] } = useParagraphStyles()

  useEffect(() => {
    if (!editor) return
    setStyleChordHandler(editor, (event) => {
      const shortcut = shortcuts.find((s) => eventIsChord(event, s.keys, isMac))
      if (!shortcut) return false
      const custom = styles.find((style) => customStyleKey(style.id) === shortcut.style)
      const builtIn = PARAGRAPH_STYLES.find((style) => style.id === shortcut.style)
      if (!custom && !builtIn) return false
      event.preventDefault()
      if (custom) applyCustomParagraphStyle(editor, custom, userId)
      else if (builtIn) applyParagraphStyle(editor, builtIn.id)
      return true
    })
    return () => setStyleChordHandler(editor, null)
  }, [editor, shortcuts, styles, userId])
}
