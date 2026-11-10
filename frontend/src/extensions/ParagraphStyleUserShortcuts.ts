import { Extension, type Editor } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'

// The keystrokes a person assigned to paragraph styles themselves
// (data/paragraphStyleShortcut.ts). They change while the document is open, so the
// extension holds one handler in its storage that hooks/useUserStyleShortcuts.ts keeps
// current, and a plugin that offers it every keydown. The priority puts it ahead of the
// editor's own keymaps, so the person's choice wins when a chord is shared.
export type StyleChordHandler = (event: KeyboardEvent) => boolean

export const ParagraphStyleUserShortcuts = Extension.create<object, { handle: StyleChordHandler | null }>({
  name: 'paragraphStyleUserShortcuts',
  priority: 1000,

  addStorage() {
    return { handle: null }
  },

  addProseMirrorPlugins() {
    const storage = this.storage
    return [
      new Plugin({
        props: {
          handleKeyDown: (_view, event) => storage.handle?.(event) ?? false,
        },
      }),
    ]
  },
})

// Replaces the handler an editor offers keydowns to (null to stop).
export function setStyleChordHandler(editor: Pick<Editor, 'storage'>, handle: StyleChordHandler | null): void {
  const storage = editor.storage.paragraphStyleUserShortcuts as { handle: StyleChordHandler | null } | undefined
  if (storage) storage.handle = handle
}
