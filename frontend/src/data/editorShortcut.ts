// The document editor's keyboard shortcuts, in one place. The editor
// (extensions/EditorShortcuts.ts), the ⌘/ cheat sheet, the toolbar tooltips, the
// Mac app's Format menu (macos/Sources/Inertia/Components/FormatMenu.swift) and
// docs/keyboard-shortcuts.md all read from here, and tests check the doc and the
// menu list every row, so they can't drift. Apple Notes keys first, Google Docs
// keys where Notes has none; where the two disagree, Notes wins (Alex, 2026-10-18).
//
// Each row has the Mac keystroke people see and the same keystroke as a TipTap key
// name (Mod is ⌘ on a Mac and Ctrl elsewhere). Windows and Linux read ⌘ as Ctrl; a
// row whose Mac keys cannot work there (⌃⌘↑ needs the Windows key, ⌥⌘T opens a
// terminal on Linux) carries its own `win` keystroke, or null for none.

import { platformKeys } from '@/util/keyLabel'

export type EditorAction =
  | 'strike' | 'bulletList' | 'orderedList' | 'dashedList' | 'taskList' | 'taskDone' | 'codeBlock'
  | 'link' | 'table' | 'indent' | 'outdent' | 'moveUp' | 'moveDown' | 'clearFormatting'

// What a Windows or Linux keystroke looks like when it is not the Mac one with ⌘ read as Ctrl.
export interface PlatformKeys {
  keys: string
  tiptap: string
}

export interface EditorShortcut {
  action: EditorAction
  label: string
  keys: string
  tiptap: string
  // Windows and Linux: the keystroke that replaces the Mac one, or null when none can be
  // bound there. Absent means the Mac keys with ⌘ read as Ctrl.
  win?: PlatformKeys | null
  // The backlog task that builds this command. Until it does, the key is reserved: it is
  // bound to nothing and shows nowhere (the cheat sheet, tooltips, the Format menu), and only
  // the docs list it. Remove this when the command exists in util/editorKeymap.ts.
  pending?: string
}

// The keystrokes EditorShortcuts binds, in the order the doc and the cheat sheet
// list them. The code block takes Notes' own ⌘⇧M ("Monospaced"): the Monospace
// paragraph style and the code block are the same thing (Alex, 2026-11-09, backlog
// task code-blocks-with-language-and-syntax-highlighting). The paragraph-style
// keys (paragraph-style-shortcuts) bind ⌘⇧M too; when that branch merges, the
// Monospace style must BE the code block, not a second thing on the same key.
// TipTap's own ⌘⌥C is the browsers' inspector, so it is dropped (REPLACED_DEFAULTS).
// ⌘K and ⌥⌘T are also global shortcuts: inside the document the editor wins
// (GLOBAL_CLASHES below).
export const EDITOR_SHORTCUTS: EditorShortcut[] = [
  { action: 'strike', label: 'Strikethrough', keys: '⌘⇧X', tiptap: 'Mod-Shift-x' },
  { action: 'bulletList', label: 'Bulleted list', keys: '⌘⇧7', tiptap: 'Mod-Shift-7' },
  { action: 'orderedList', label: 'Numbered list', keys: '⌘⇧9', tiptap: 'Mod-Shift-9' },
  // Notes' third list style. The key is held for the dashed list block, which ships on its
  // own branch with a toolbar button; its author drops `pending` and adds the command.
  { action: 'dashedList', label: 'Dashed list', keys: '⌘⇧8', tiptap: 'Mod-Shift-8', pending: 'dashed-list-block' },
  { action: 'taskList', label: 'Checklist', keys: '⌘⇧L', tiptap: 'Mod-Shift-l' },
  { action: 'taskDone', label: 'Mark checklist item done', keys: '⌘⇧U', tiptap: 'Mod-Shift-u' },
  { action: 'indent', label: 'Indent list item', keys: '⌘]', tiptap: 'Mod-]' },
  { action: 'outdent', label: 'Outdent list item', keys: '⌘[', tiptap: 'Mod-[' },
  // Windows and Linux have no ⌃⌘ and the Windows key never reaches a page; Google Docs'
  // move-paragraph keys stand in.
  { action: 'moveUp', label: 'Move list item up', keys: '⌃⌘↑', tiptap: 'Ctrl-Meta-ArrowUp', win: { keys: 'Ctrl+Shift+↑', tiptap: 'Mod-Shift-ArrowUp' } },
  { action: 'moveDown', label: 'Move list item down', keys: '⌃⌘↓', tiptap: 'Ctrl-Meta-ArrowDown', win: { keys: 'Ctrl+Shift+↓', tiptap: 'Mod-Shift-ArrowDown' } },
  { action: 'codeBlock', label: 'Code block', keys: '⌘⇧M', tiptap: 'Mod-Shift-m' },
  { action: 'link', label: 'Insert link', keys: '⌘K', tiptap: 'Mod-k' },
  // Ctrl+Alt+T opens a terminal on many Linux desktops and is AltGr+T on European Windows
  // layouts, so Windows and Linux have the toolbar button only.
  { action: 'table', label: 'Insert table', keys: '⌥⌘T', tiptap: 'Mod-Alt-t', win: null },
  { action: 'clearFormatting', label: 'Clear formatting', keys: '⌘\\', tiptap: 'Mod-\\' },
]

// The keys of a row on this platform: the Mac keys on a Mac, the Windows form (or its own
// `win` keys) elsewhere, null when the platform has none.
export function keysFor(row: Pick<EditorShortcut, 'keys' | 'win'>, mac: boolean): string | null {
  if (mac) return row.keys
  if (row.win === null) return null
  return row.win?.keys ?? platformKeys(row.keys, false)
}

// The TipTap key name of a row on this platform, null when the platform has none.
export function tiptapFor(row: Pick<EditorShortcut, 'tiptap' | 'win'>, mac: boolean): string | null {
  if (mac) return row.tiptap
  if (row.win === null) return null
  return row.win?.tiptap ?? row.tiptap
}

// The rows that are bound: everything except the reserved keys still waiting for their command.
export function boundShortcuts(shortcuts: EditorShortcut[] = EDITOR_SHORTCUTS): EditorShortcut[] {
  return shortcuts.filter((s) => !s.pending)
}

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
// 2026-11-09; the table now owns it, and a test pins that. The dashed list, link and
// table keys moved into the table the same day.)
export const RESERVED_KEYS: ReservedKey[] = [
  { keys: '⌘⌥7', tiptap: 'Mod-Alt-7', for: 'Title style', task: 'paragraph-style-shortcuts' },
  { keys: '⌘⌥8', tiptap: 'Mod-Alt-8', for: 'Subtitle style', task: 'paragraph-style-shortcuts' },
  { keys: '⌘⌥9', tiptap: 'Mod-Alt-9', for: 'Quote style', task: 'paragraph-style-shortcuts' },
]

// Notes' Title / Heading / Subheading / Body keys, deliberately not bound: Alex's
// style keys (⌘⌥ and a digit) replace them; ⌘⇧T and ⌘⇧J also trigger the global
// New task and New idea, whose handler ignores Shift; and browsers keep ⌘⇧T, ⌘⇧B,
// ⌘⇧H and ⌘⇧J for themselves.
export const NOT_BOUND_NOTES_KEYS = ['Mod-Shift-t', 'Mod-Shift-h', 'Mod-Shift-j', 'Mod-Shift-b']

// Keystrokes the browsers keep for their windows and tabs and never hand to a page, so
// a page's preventDefault can't take them (Chrome, Edge, Firefox and Safari; written from
// memory in mid-2026 and not checked in each browser). No editor key may be one.
export const BROWSER_RESERVED_KEYS: { tiptap: string; for: string }[] = [
  { tiptap: 'Mod-n', for: 'New window' },
  { tiptap: 'Mod-Shift-n', for: 'New private or incognito window' },
  { tiptap: 'Mod-t', for: 'New tab' },
  { tiptap: 'Mod-Shift-t', for: 'Reopen the closed tab' },
  { tiptap: 'Mod-w', for: 'Close the tab' },
  { tiptap: 'Mod-Shift-w', for: 'Close the window' },
  { tiptap: 'Mod-q', for: 'Quit the browser (Mac)' },
]

// Keystrokes the desktop takes before any program sees them.
export const DESKTOP_RESERVED_KEYS: { tiptap: string; for: string; platform: string }[] = [
  { tiptap: 'Mod-Alt-t', for: 'Open a terminal (Ubuntu and other GNOME or KDE desktops)', platform: 'Linux' },
]

// Chords that the editor and a global shortcut (components/file-manager/Sidebar.tsx) both
// want. Inside the document editor the formatting meaning wins (Alex, 2026-11-09): the
// global handler skips the chord there (util/shortcuts.ts, editorKeepsKey), and the
// global action keeps working everywhere else. Quick-add and New task also have buttons.
export interface GlobalClash {
  // The editor command on the chord (the Format menu id).
  action: 'link' | 'inlineCode' | 'table'
  keys: string
  tiptap: string
  editor: string
  global: string
  // The key the global handler reads, and whether it needs ⌥ with ⌘.
  globalKey: string
  globalAlt: boolean
}

export const GLOBAL_CLASHES: GlobalClash[] = [
  { action: 'link', keys: '⌘K', tiptap: 'Mod-k', editor: 'Insert link', global: 'Quick-add a task or event', globalKey: 'k', globalAlt: false },
  { action: 'inlineCode', keys: '⌘E', tiptap: 'Mod-e', editor: 'Inline code', global: 'New event', globalKey: 'e', globalAlt: false },
  { action: 'table', keys: '⌥⌘T', tiptap: 'Mod-Alt-t', editor: 'Insert table', global: 'New task (in a browser; the Mac app and Electron also take ⌘T)', globalKey: 't', globalAlt: true },
]

// The clash a Format menu command belongs to, if the chord also has a global meaning.
export function clashForAction(action: string): GlobalClash | undefined {
  return GLOBAL_CLASHES.find((clash) => clash.action === action)
}

// What the ⌘/ sheet and the doc list for a document: the bound table rows, then the keys
// that already matched, with the keys of this platform. A row with no keys here is left out.
export function documentShortcutRows(mac: boolean): { label: string; keys: string }[] {
  const table = boundShortcuts().flatMap((s) => {
    const keys = keysFor(s, mac)
    return keys ? [{ label: s.label, keys }] : []
  })
  return [...table, ...INHERITED_SHORTCUTS.map(({ label, keys }) => ({ label, keys: platformKeys(keys, mac) }))]
}

// A toolbar tooltip with its key: "Strikethrough (⌘⇧X)". A row with no key here, or still
// pending, leaves the label as it is.
export function titleWithShortcut(label: string, action: EditorAction, mac: boolean, shortcuts: EditorShortcut[] = EDITOR_SHORTCUTS): string {
  const row = boundShortcuts(shortcuts).find((s) => s.action === action)
  const keys = row ? keysFor(row, mac) : null
  return keys ? `${label} (${keys})` : label
}

// Every TipTap key the editor gives a meaning to on this platform, with the key repeated if
// two rows share it. Reserved and pending keys count: nothing else may take them.
export function allEditorKeys(mac = true): string[] {
  return [
    ...EDITOR_SHORTCUTS.flatMap((s) => tiptapFor(s, mac) ?? []),
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

// The Mac app's Format menu. The shell is a WKWebView around this same editor, so each
// menu item sends its action id to the page as a window event (below) and
// extensions/EditorShortcuts.ts runs it on the focused editor. The items are the bound
// table rows plus the keys TipTap already binds that people look for in a Format menu.
export const EDITOR_COMMAND_EVENT = 'inertia:editor-command'

export type MenuAction = EditorAction | 'bold' | 'italic' | 'underline' | 'inlineCode' | 'normalText'
  | 'heading1' | 'heading2' | 'heading3' | 'heading4' | 'heading5'

export interface FormatMenuItem {
  action: MenuAction
  label: string
  keys: string
}

// Menu items for keys that are not table rows (TipTap binds them itself).
export const FORMAT_MENU_INHERITED: FormatMenuItem[] = [
  { action: 'bold', label: 'Bold', keys: '⌘B' },
  { action: 'italic', label: 'Italic', keys: '⌘I' },
  { action: 'underline', label: 'Underline', keys: '⌘U' },
  { action: 'inlineCode', label: 'Inline code', keys: '⌘E' },
  { action: 'normalText', label: 'Normal text', keys: '⌘⌥0' },
  ...[1, 2, 3, 4, 5].map((level) => ({ action: `heading${level}` as MenuAction, label: `Heading ${level}`, keys: `⌘⌥${level}` })),
]

// Every item the Format menu has, Mac keys only (it is a Mac menu).
export function formatMenuItems(): FormatMenuItem[] {
  return [
    ...FORMAT_MENU_INHERITED,
    ...boundShortcuts().map(({ action, label, keys }) => ({ action, label, keys })),
  ]
}
