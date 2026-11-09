import type { Editor } from '@tiptap/core'
import { EDITOR_SHORTCUTS, type EditorAction, type EditorShortcut } from '@/data/editorShortcut'
import { insertTaskList, moveListItem, toggleTaskDone } from './editorCommand'

type KeymapEditor = Pick<Editor, 'state' | 'view' | 'commands' | 'chain'>

// Indenting nests a bulleted or numbered item under the one above it. A checklist
// line holds one paragraph and cannot hold a list, so there is nothing to nest.
// Outdenting a checklist line takes it out of the list, like Shift+Tab.
function commandsFor(editor: KeymapEditor): Record<EditorAction, () => boolean> {
  return {
    strike: () => editor.commands.toggleStrike(),
    bulletList: () => editor.commands.toggleBulletList(),
    orderedList: () => editor.commands.toggleOrderedList(),
    taskList: () => insertTaskList(editor),
    taskDone: () => toggleTaskDone(editor),
    codeBlock: () => editor.commands.toggleCodeBlock(),
    indent: () => editor.commands.sinkListItem('listItem'),
    outdent: () => editor.commands.liftListItem('workspaceTaskItem') || editor.commands.liftListItem('listItem'),
    moveUp: () => moveListItem(editor, -1),
    moveDown: () => moveListItem(editor, 1),
    clearFormatting: () => editor.chain().focus().unsetAllMarks().clearNodes().run(),
  }
}

// The TipTap keymap for the shortcut table: each key runs its action's command.
export function editorKeymap(editor: KeymapEditor, shortcuts: EditorShortcut[] = EDITOR_SHORTCUTS): Record<string, () => boolean> {
  const run = commandsFor(editor)
  return Object.fromEntries(shortcuts.map((s) => [s.tiptap, run[s.action]]))
}
