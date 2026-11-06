import type { ParagraphStyleId } from './paragraphStyle'

// Keyboard shortcuts for the built-in paragraph styles, in one table. The editor
// (extensions/ParagraphStyleShortcuts.ts) binds them and docs/keyboard-shortcuts.md
// lists them, with a test that fails if the two drift. All are ⌘⌥ plus a digit,
// like Google Docs' headings: browsers keep ⌘⌥N/T/W for themselves, and ⌃⌘1 to
// ⌃⌘9 are left free for styles people assign themselves (paragraph-style-keystrokes).
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

// Caption and Monospace have no default key: neither app has one for Caption, and
// Apple Notes' Monospaced key (⌘⇧M) is also the planned code block key. Body's
// ⌘⌥0 is TipTap's Paragraph key too; it is bound here so it also sets the style.
export const PARAGRAPH_STYLE_SHORTCUTS: ParagraphStyleShortcut[] = [
  { style: 'title', keys: '⌘⌥7', tiptap: 'Mod-Alt-7', boundBy: 'styles' },
  { style: 'subtitle', keys: '⌘⌥8', tiptap: 'Mod-Alt-8', boundBy: 'styles' },
  { style: 'heading1', keys: '⌘⌥1', tiptap: 'Mod-Alt-1', boundBy: 'heading' },
  { style: 'heading2', keys: '⌘⌥2', tiptap: 'Mod-Alt-2', boundBy: 'heading' },
  { style: 'heading3', keys: '⌘⌥3', tiptap: 'Mod-Alt-3', boundBy: 'heading' },
  { style: 'body', keys: '⌘⌥0', tiptap: 'Mod-Alt-0', boundBy: 'styles' },
  { style: 'quote', keys: '⌘⌥9', tiptap: 'Mod-Alt-9', boundBy: 'styles' },
]

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
