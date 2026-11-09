// The document editor's keyboard shortcuts, in one place. The editor
// (extensions/EditorShortcuts.ts), the ⌘/ cheat sheet, the toolbar tooltips and
// docs/keyboard-shortcuts.md all read from here, and a test checks the doc lists
// every row, so they can't drift. Apple Notes keys first, Google Docs keys where
// Notes has none; where the two disagree, Notes wins (Alex, 2026-10-18).
//
// Keys are the Mac keystroke people see (⌘ is Ctrl on Windows and Linux, which is
// the windows-linux-editor-shortcuts task) and the same keystroke as a TipTap key
// name (Mod is ⌘ or Ctrl).

export type EditorAction =
  | 'strike' | 'bulletList' | 'orderedList' | 'taskList' | 'taskDone' | 'codeBlock'
  | 'indent' | 'outdent' | 'moveUp' | 'moveDown' | 'clearFormatting'

export interface EditorShortcut {
  action: EditorAction
  label: string
  keys: string
  tiptap: string
}

// The keystrokes EditorShortcuts binds, in the order the doc and the cheat sheet
// list them. The code block takes Notes' own ⌘⇧M ("Monospaced"): the Monospace
// paragraph style and the code block are the same thing (Alex, 2026-11-09, backlog
// task code-blocks-with-language-and-syntax-highlighting). The paragraph-style
// keys (paragraph-style-shortcuts) bind ⌘⇧M too; when that branch merges, the
// Monospace style must BE the code block, not a second thing on the same key.
// TipTap's own ⌘⌥C is the browsers' inspector, so it is dropped (REPLACED_DEFAULTS).
export const EDITOR_SHORTCUTS: EditorShortcut[] = [
  { action: 'strike', label: 'Strikethrough', keys: '⌘⇧X', tiptap: 'Mod-Shift-x' },
  { action: 'bulletList', label: 'Bulleted list', keys: '⌘⇧7', tiptap: 'Mod-Shift-7' },
  { action: 'orderedList', label: 'Numbered list', keys: '⌘⇧9', tiptap: 'Mod-Shift-9' },
  { action: 'taskList', label: 'Checklist', keys: '⌘⇧L', tiptap: 'Mod-Shift-l' },
  { action: 'taskDone', label: 'Mark checklist item done', keys: '⌘⇧U', tiptap: 'Mod-Shift-u' },
  { action: 'indent', label: 'Indent list item', keys: '⌘]', tiptap: 'Mod-]' },
  { action: 'outdent', label: 'Outdent list item', keys: '⌘[', tiptap: 'Mod-[' },
  { action: 'moveUp', label: 'Move list item up', keys: '⌃⌘↑', tiptap: 'Ctrl-Meta-ArrowUp' },
  { action: 'moveDown', label: 'Move list item down', keys: '⌃⌘↓', tiptap: 'Ctrl-Meta-ArrowDown' },
  { action: 'codeBlock', label: 'Code block', keys: '⌘⇧M', tiptap: 'Mod-Shift-m' },
  { action: 'clearFormatting', label: 'Clear formatting', keys: '⌘\\', tiptap: 'Mod-\\' },
]

// Default TipTap bindings the table replaces. They must be dropped, so one
// keystroke never does two things (⌘⇧8 stays free for the dashed list):
// [extension name, key].
export const REPLACED_DEFAULTS: [string, string][] = [
  ['strike', 'Mod-Shift-s'],
  ['bulletList', 'Mod-Shift-8'],
  ['orderedList', 'Mod-Shift-7'],
  ['codeBlock', 'Mod-Alt-c'],
]

// The default keys of the extension called `name` that the table replaces.
export function replacedKeys(name: string): string[] {
  return REPLACED_DEFAULTS.filter(([extension]) => extension === name).map(([, key]) => key)
}

export interface InheritedShortcut {
  label: string
  keys: string
  // The TipTap keys behind it (none for the browser's own).
  tiptap: string[]
}

// Keystrokes that already match Apple Notes or Google Docs and are bound by
// TipTap's own extensions or the browser, left as they are.
export const INHERITED_SHORTCUTS: InheritedShortcut[] = [
  { label: 'Bold', keys: '⌘B', tiptap: ['Mod-b'] },
  { label: 'Italic', keys: '⌘I', tiptap: ['Mod-i'] },
  { label: 'Underline', keys: '⌘U', tiptap: ['Mod-u'] },
  { label: 'Undo', keys: '⌘Z', tiptap: ['Mod-z'] },
  { label: 'Redo', keys: '⌘⇧Z', tiptap: ['Mod-Shift-z'] },
  { label: 'Heading 1 to 5', keys: '⌘⌥1–5', tiptap: [1, 2, 3, 4, 5].map((level) => `Mod-Alt-${level}`) },
  { label: 'Normal text', keys: '⌘⌥0', tiptap: ['Mod-Alt-0'] },
  { label: 'Inline code', keys: '⌘E', tiptap: ['Mod-e'] },
  { label: 'Line break', keys: 'Shift+Enter', tiptap: ['Shift-Enter'] },
  { label: 'Paste without formatting', keys: '⌘⇧V', tiptap: [] },
]

export interface ReservedKey {
  keys: string
  tiptap: string
  // What the key is kept for.
  for: string
  // The backlog task that binds it.
  task: string
}

// Keys another backlog task binds. They stay out of the table, and a test fails if
// the table takes one, so those tasks find them free. (⌘⇧M was on this list for
// Monospace until Alex made the Monospace style and the code block one thing on
// 2026-11-09; the table now owns it, and a test pins that.)
export const RESERVED_KEYS: ReservedKey[] = [
  { keys: '⌘⌥7', tiptap: 'Mod-Alt-7', for: 'Title style', task: 'paragraph-style-shortcuts' },
  { keys: '⌘⌥8', tiptap: 'Mod-Alt-8', for: 'Subtitle style', task: 'paragraph-style-shortcuts' },
  { keys: '⌘⌥9', tiptap: 'Mod-Alt-9', for: 'Quote style', task: 'paragraph-style-shortcuts' },
  { keys: '⌘⇧8', tiptap: 'Mod-Shift-8', for: 'Dashed list', task: 'dashed-list-block' },
  { keys: '⌘K', tiptap: 'Mod-k', for: 'Insert link', task: 'editor-vs-global-shortcut-clashes' },
  { keys: '⌥⌘T', tiptap: 'Mod-Alt-t', for: 'Insert table', task: 'editor-vs-global-shortcut-clashes' },
]

// Notes' Title / Heading / Subheading / Body keys, deliberately not bound: Alex's
// style keys (⌘⌥ and a digit) replace them; ⌘⇧T and ⌘⇧J also trigger the global
// New task and New idea, whose handler ignores Shift; and browsers keep ⌘⇧T, ⌘⇧B,
// ⌘⇧H and ⌘⇧J for themselves.
export const NOT_BOUND_NOTES_KEYS = ['Mod-Shift-t', 'Mod-Shift-h', 'Mod-Shift-j', 'Mod-Shift-b']

// What the ⌘/ sheet and the doc list for a document: the table, then the keys that
// already matched.
export function documentShortcutRows(): { label: string; keys: string }[] {
  return [...EDITOR_SHORTCUTS, ...INHERITED_SHORTCUTS].map(({ label, keys }) => ({ label, keys }))
}

// A toolbar tooltip with its key: "Strikethrough (⌘⇧X)".
export function titleWithShortcut(label: string, action: EditorAction, shortcuts: EditorShortcut[] = EDITOR_SHORTCUTS): string {
  const keys = shortcuts.find((s) => s.action === action)?.keys
  return keys ? `${label} (${keys})` : label
}

// Every TipTap key the editor gives a meaning to, with the key repeated if two
// rows share it.
export function allEditorKeys(): string[] {
  return [
    ...EDITOR_SHORTCUTS.map((s) => s.tiptap),
    ...INHERITED_SHORTCUTS.flatMap((s) => s.tiptap),
    ...RESERVED_KEYS.map((s) => s.tiptap),
  ]
}

// Keys that appear more than once (should be none).
export function duplicateKeys(keys: string[] = allEditorKeys()): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  keys.forEach((key) => { if (seen.has(key)) duplicates.add(key); seen.add(key) })
  return [...duplicates]
}
