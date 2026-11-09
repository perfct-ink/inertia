import { Extension } from '@tiptap/core'
import { editorKeymap } from '@/util/editorKeymap'

// Binds the keystrokes in data/editorShortcut.ts to the editor's commands.
export const EditorShortcuts = Extension.create({
  name: 'editorShortcuts',

  addKeyboardShortcuts() {
    return editorKeymap(this.editor)
  },
})
