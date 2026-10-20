// The document editor's keyboard shortcuts, in one table. The editor
// (extensions/EditorShortcuts.ts), the ⌘/ cheat sheet and docs/keyboard-shortcuts.md
// all read from here, and a test checks the doc lists every one, so they can't
// drift. Apple Notes first, Google Docs where Notes has none (see the doc).

export type EditorAction =
  | 'strike' | 'title' | 'heading' | 'subheading' | 'body' | 'normalText'
  | 'bulletList' | 'orderedList' | 'taskList' | 'codeBlock' | 'table'
  | 'indent' | 'outdent' | 'clearFormatting'

export interface EditorShortcut {
  action: EditorAction
  label: string
  // The Mac keystroke as shown to people (⌘ is Ctrl on Windows and Linux).
  keys: string
  // The same keystroke as a TipTap key name (Mod is ⌘ or Ctrl).
  tiptap: string
}

export const EDITOR_SHORTCUTS: EditorShortcut[] = [
  { action: 'strike', label: 'Strikethrough', keys: '⌘⇧X', tiptap: 'Mod-Shift-x' },
  { action: 'title', label: 'Title (Heading 1)', keys: '⌘⇧T', tiptap: 'Mod-Shift-t' },
  { action: 'heading', label: 'Heading (Heading 2)', keys: '⌘⇧H', tiptap: 'Mod-Shift-h' },
  { action: 'subheading', label: 'Subheading (Heading 3)', keys: '⌘⇧J', tiptap: 'Mod-Shift-j' },
  { action: 'body', label: 'Body text', keys: '⌘⇧B', tiptap: 'Mod-Shift-b' },
  { action: 'normalText', label: 'Normal text', keys: '⌘⌥0', tiptap: 'Mod-Alt-0' },
  { action: 'bulletList', label: 'Bulleted list', keys: '⌘⇧7', tiptap: 'Mod-Shift-7' },
  { action: 'orderedList', label: 'Numbered list', keys: '⌘⇧9', tiptap: 'Mod-Shift-9' },
  { action: 'taskList', label: 'Checklist', keys: '⌘⇧L', tiptap: 'Mod-Shift-l' },
  { action: 'codeBlock', label: 'Monospaced code block', keys: '⌘⇧M', tiptap: 'Mod-Shift-m' },
  { action: 'table', label: 'Insert table', keys: '⌥⌘T', tiptap: 'Mod-Alt-t' },
  { action: 'indent', label: 'Indent list item', keys: '⌘]', tiptap: 'Mod-]' },
  { action: 'outdent', label: 'Outdent list item', keys: '⌘[', tiptap: 'Mod-[' },
  { action: 'clearFormatting', label: 'Clear formatting', keys: '⌘\\', tiptap: 'Mod-\\' },
]

// Default TipTap bindings these replace, which must be dropped so one keystroke
// never does two things: [extension name, key].
export const REPLACED_DEFAULTS: [string, string][] = [
  ['strike', 'Mod-Shift-s'],
  ['bulletList', 'Mod-Shift-8'],
  ['orderedList', 'Mod-Shift-7'],
  ['codeBlock', 'Mod-Alt-c'],
]

// Names of shortcut keystrokes that appear more than once (should be none).
export function duplicateShortcuts(shortcuts: EditorShortcut[] = EDITOR_SHORTCUTS): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  shortcuts.forEach((s) => { if (seen.has(s.tiptap)) duplicates.add(s.tiptap); seen.add(s.tiptap) })
  return [...duplicates]
}
