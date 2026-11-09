import type { Editor } from '@tiptap/core'
import { boundShortcuts, tiptapFor, EDITOR_SHORTCUTS, type EditorShortcut, type MenuAction } from '@/data/editorShortcut'
import { insertTable, insertTaskList, moveListItem, toggleTaskDone } from './editorCommand'

type KeymapEditor = Pick<Editor, 'state' | 'view' | 'commands' | 'chain'>

// An editor without checklists (a test's, say) has no task item to lift.
function hasNode(editor: KeymapEditor, name: string): boolean {
  const schema = editor.state?.schema
  return !schema || Boolean(schema.nodes[name])
}

// What the editor cannot do by itself: the screen owns the link dialog.
export interface EditorHandlers {
  openLinkDialog?: () => void
}

// Indenting nests a bulleted or numbered item under the one above it. A checklist
// line holds one paragraph and cannot hold a list, so there is nothing to nest.
// Outdenting a checklist line takes it out of the list, like Shift+Tab.
export function editorCommands(editor: KeymapEditor, handlers: EditorHandlers = {}): Record<MenuAction, () => boolean> {
  const heading = (level: 1 | 2 | 3 | 4 | 5) => () => editor.chain().focus().toggleHeading({ level }).run()
  return {
    strike: () => editor.commands.toggleStrike(),
    bulletList: () => editor.commands.toggleBulletList(),
    orderedList: () => editor.commands.toggleOrderedList(),
    // The dashed list block is its own backlog task (dashed-list-block). Its row in the
    // table is pending, so no key or menu item reaches this until that task replaces it.
    dashedList: () => false,
    taskList: () => insertTaskList(editor),
    taskDone: () => toggleTaskDone(editor),
    codeBlock: () => editor.commands.toggleCodeBlock(),
    link: () => { handlers.openLinkDialog?.(); return Boolean(handlers.openLinkDialog) },
    table: () => insertTable(editor),
    indent: () => editor.commands.sinkListItem('listItem'),
    outdent: () => (hasNode(editor, 'workspaceTaskItem') && editor.commands.liftListItem('workspaceTaskItem')) || editor.commands.liftListItem('listItem'),
    moveUp: () => moveListItem(editor, -1),
    moveDown: () => moveListItem(editor, 1),
    clearFormatting: () => editor.chain().focus().unsetAllMarks().clearNodes().run(),
    // Keys TipTap binds itself, which the Mac app's Format menu also sends.
    bold: () => editor.chain().focus().toggleBold().run(),
    italic: () => editor.chain().focus().toggleItalic().run(),
    underline: () => editor.chain().focus().toggleUnderline().run(),
    inlineCode: () => editor.chain().focus().toggleCode().run(),
    normalText: () => editor.chain().focus().setParagraph().run(),
    heading1: heading(1),
    heading2: heading(2),
    heading3: heading(3),
    heading4: heading(4),
    heading5: heading(5),
  }
}

// The TipTap keymap for the shortcut table on this platform: each key runs its action's
// command. Pending rows, and rows with no key on this platform, are left out.
export function editorKeymap(
  editor: KeymapEditor,
  shortcuts: EditorShortcut[] = EDITOR_SHORTCUTS,
  mac = true,
  handlers: EditorHandlers = {},
): Record<string, () => boolean> {
  const run = editorCommands(editor, handlers)
  const entries = boundShortcuts(shortcuts).flatMap((s) => {
    const key = tiptapFor(s, mac)
    return key ? [[key, run[s.action]] as const] : []
  })
  return Object.fromEntries(entries)
}
