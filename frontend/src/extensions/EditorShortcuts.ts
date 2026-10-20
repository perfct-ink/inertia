import { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import { EDITOR_SHORTCUTS, type EditorAction } from '@/data/shortcuts'

// Starts a checklist at the cursor: a task list with one empty task line.
export function insertTaskList(editor: Editor): boolean {
  const { state, view } = editor
  const { workspaceTaskList, workspaceTaskItem, paragraph } = state.schema.nodes
  const node = workspaceTaskList.create(null, [workspaceTaskItem.create(null, paragraph.create())])
  view.dispatch(state.tr.replaceSelectionWith(node))
  editor.commands.focus()
  return true
}

// Binds the keystrokes in data/shortcuts.ts to the editor's commands.
export const EditorShortcuts = Extension.create({
  name: 'editorShortcuts',

  addKeyboardShortcuts() {
    const editor = this.editor
    const run: Record<EditorAction, () => boolean> = {
      strike: () => editor.commands.toggleStrike(),
      title: () => editor.commands.toggleHeading({ level: 1 }),
      heading: () => editor.commands.toggleHeading({ level: 2 }),
      subheading: () => editor.commands.toggleHeading({ level: 3 }),
      body: () => editor.commands.setParagraph(),
      normalText: () => editor.commands.setParagraph(),
      bulletList: () => editor.commands.toggleBulletList(),
      orderedList: () => editor.commands.toggleOrderedList(),
      taskList: () => insertTaskList(editor),
      codeBlock: () => editor.commands.toggleCodeBlock(),
      table: () => editor.commands.insertTable({ rows: 3, cols: 3, withHeaderRow: true }),
      indent: () => editor.commands.sinkListItem('workspaceTaskItem') || editor.commands.sinkListItem('listItem'),
      outdent: () => editor.commands.liftListItem('workspaceTaskItem') || editor.commands.liftListItem('listItem'),
      clearFormatting: () => editor.chain().focus().unsetAllMarks().clearNodes().run(),
    }
    return Object.fromEntries(EDITOR_SHORTCUTS.map((s) => [s.tiptap, run[s.action]]))
  },
})
