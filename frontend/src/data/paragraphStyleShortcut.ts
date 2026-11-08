import { styleById, type ParagraphStyleId } from './paragraphStyle'

// Keyboard shortcuts for the built-in paragraph styles, in one table. The editor
// (extensions/ParagraphStyleShortcuts.ts) binds them, the Style menu and the ⌘/
// sheet show them, and docs/keyboard-shortcuts.md lists them, with a test that
// fails if the doc drifts. Headings are ⌘⌥ plus their level, 1 to 6 (TipTap's own
// keys; the menu offers 1 to 3), and the other styles ⌘⌥ plus a digit, like
// Google Docs: browsers keep ⌘⌥N/T/W for themselves, and ⌃⌘1 to ⌃⌘9 are left free
// for styles people assign themselves (paragraph-style-keystrokes). Monospace is
// ⌘⇧M, as in Apple Notes.
export interface ParagraphStyleShortcut {
  style: ParagraphStyleId
  // The Mac keystroke as shown to people (⌘ is Ctrl on Windows and Linux).
  keys: string
  // The same keystroke as a TipTap key name (Mod is ⌘ or Ctrl).
  tiptap: string
  // Who binds it: TipTap's own Heading extension (which toggles the heading and
  // is left alone), or ParagraphStyleShortcuts (which sets the style).
  boundBy: 'heading' | 'styles'
}

// Caption has no default key yet (neither Apple Notes nor Google Docs has one).
// Body's ⌘⌥0 is TipTap's Paragraph key too; it is bound here so it also sets the style.
export const PARAGRAPH_STYLE_SHORTCUTS: ParagraphStyleShortcut[] = [
  { style: 'title', keys: '⌘⌥7', tiptap: 'Mod-Alt-7', boundBy: 'styles' },
  { style: 'subtitle', keys: '⌘⌥8', tiptap: 'Mod-Alt-8', boundBy: 'styles' },
  { style: 'heading1', keys: '⌘⌥1', tiptap: 'Mod-Alt-1', boundBy: 'heading' },
  { style: 'heading2', keys: '⌘⌥2', tiptap: 'Mod-Alt-2', boundBy: 'heading' },
  { style: 'heading3', keys: '⌘⌥3', tiptap: 'Mod-Alt-3', boundBy: 'heading' },
  { style: 'body', keys: '⌘⌥0', tiptap: 'Mod-Alt-0', boundBy: 'styles' },
  { style: 'quote', keys: '⌘⌥9', tiptap: 'Mod-Alt-9', boundBy: 'styles' },
  { style: 'monospace', keys: '⌘⇧M', tiptap: 'Mod-Shift-m', boundBy: 'styles' },
]

// Headings 4 to 6 have TipTap's ⌘⌥4 to ⌘⌥6 but no entry in the Style menu, so they
// are not in the table above.
export const OTHER_HEADING_SHORTCUTS: { label: string; keys: string }[] = [4, 5, 6].map((level) => ({ label: `Heading ${level}`, keys: `⌘⌥${level}` }))

// The shortcut a style has, if any.
export function shortcutOfStyle(style: ParagraphStyleId, shortcuts: ParagraphStyleShortcut[] = PARAGRAPH_STYLE_SHORTCUTS): ParagraphStyleShortcut | undefined {
  return shortcuts.find((s) => s.style === style)
}

// Keystrokes that appear more than once (should be none).
export function duplicateStyleShortcuts(shortcuts: ParagraphStyleShortcut[] = PARAGRAPH_STYLE_SHORTCUTS): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  shortcuts.forEach((s) => { if (seen.has(s.tiptap)) duplicates.add(s.tiptap); seen.add(s.tiptap) })
  return [...duplicates]
}

// The rows of the ⌘/ sheet for the styles: each style with a key, then the other headings.
export function styleShortcutRows(shortcuts: ParagraphStyleShortcut[] = PARAGRAPH_STYLE_SHORTCUTS): { label: string; keys: string }[] {
  return [...shortcuts.map((s) => ({ label: styleById(s.style).label, keys: s.keys })), ...OTHER_HEADING_SHORTCUTS]
}
