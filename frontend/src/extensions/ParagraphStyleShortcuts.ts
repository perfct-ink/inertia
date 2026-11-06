import { Extension } from '@tiptap/core'
import { paragraphStyleKeymap } from '@/util/paragraphStyleCommand'

// Keyboard shortcuts for the built-in paragraph styles (Title, Subtitle, Body,
// Quote); the table is in data/paragraphStyleShortcut.ts.
export const ParagraphStyleShortcuts = Extension.create({
  name: 'paragraphStyleShortcuts',

  addKeyboardShortcuts() {
    return paragraphStyleKeymap(this.editor)
  },
})
