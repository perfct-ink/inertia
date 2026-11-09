import { Extension } from '@tiptap/core'
import { EDITOR_COMMAND_EVENT, type MenuAction } from '@/data/editorShortcut'
import { editorCommands, editorKeymap, type EditorHandlers } from '@/util/editorKeymap'
import { isMac } from '@/util/platform'

// Binds the keystrokes in data/editorShortcut.ts to the editor's commands, and runs the
// commands the Mac app's Format menu sends (the same ids, as EDITOR_COMMAND_EVENT).
// The screen passes what the editor can't do alone: `openLinkDialog`.
export const EditorShortcuts = Extension.create<EditorHandlers>({
  name: 'editorShortcuts',

  addOptions() {
    return {}
  },

  addKeyboardShortcuts() {
    return editorKeymap(this.editor, undefined, isMac, this.options)
  },

  // The Format menu command is for the editor that has the cursor. With no editor focused
  // the page leaves it alone (Sidebar.tsx gives ⌘K, ⌘E and ⌥⌘T their global meaning back).
  onCreate() {
    const editor = this.editor
    const handlers = this.options
    const onCommand = (event: Event) => {
      if (!editor.isFocused) return
      const action = (event as CustomEvent<MenuAction>).detail
      const commands = editorCommands(editor, handlers)
      // The id comes from outside the page (the shell), so only a known one runs.
      if (Object.prototype.hasOwnProperty.call(commands, action)) commands[action]()
    }
    window.addEventListener(EDITOR_COMMAND_EVENT, onCommand)
    this.storage.stop = () => window.removeEventListener(EDITOR_COMMAND_EVENT, onCommand)
  },

  onDestroy() {
    this.storage.stop?.()
  },

  addStorage() {
    return { stop: undefined as (() => void) | undefined }
  },
})
