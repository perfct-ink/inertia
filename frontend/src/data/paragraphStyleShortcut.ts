import { styleById, type ParagraphStyleId } from './paragraphStyle'
import { EDITOR_SHORTCUTS, INHERITED_SHORTCUTS, tiptapFor } from './editorShortcut'
import { platformKeys } from '@/util/keyLabel'

// Keyboard shortcuts for the built-in paragraph styles, in one table. The editor
// (extensions/ParagraphStyleShortcuts.ts) binds them, the Style menu and the ⌘/
// sheet show them, and docs/keyboard-shortcuts.md lists them, with a test that
// fails if the doc drifts. Headings are ⌘⌥ plus their level, 1 to 5 (TipTap's own
// keys; the menu offers 1 to 3), and the other styles ⌘⌥ plus a digit, like
// Google Docs: browsers keep ⌘⌥N/T/W for themselves, and ⌃⌘1 to ⌃⌘9 are left free
// for styles people assign themselves (paragraph-style-keystrokes). Monospace is
// keyless here: ⌘⇧M is the code block (Alex, 2026-11-09: Monospace and the code block
// are to become one thing, code-blocks-with-language-and-syntax-highlighting).
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
]

// Headings 4 and 5 have TipTap's ⌘⌥4 and ⌘⌥5 but no entry in the Style menu, so they
// are not in the table above.
export const OTHER_HEADING_SHORTCUTS: { label: string; keys: string }[] = [4, 5].map((level) => ({ label: `Heading ${level}`, keys: `⌘⌥${level}` }))

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

// ── Keystrokes people assign themselves ─────────────────────────────────────────
// Any style, built-in or their own, can be given a chord (paragraph-style-keystrokes),
// saved to their account (ParagraphStyleShortcut in the backend; KEEP IN SYNC). A chord is
// named "Ctrl-Mod-Alt-Shift-<key>" with only the modifiers it uses, in that order. Mod is
// ⌘ on a Mac and Ctrl elsewhere; Ctrl is the Control key beside it, so ⌃⌘1 is Ctrl-Mod-1
// (the free range suggested for styles). Every chord has Mod, so plain typing is never taken.
// A person's chord wins over the editor's own inside a document.
export interface UserStyleShortcut {
  // A built-in style id ("quote") or a custom style's key ("custom-12").
  style: string
  keys: string
}

export const STYLE_CHORD = /^(?:Ctrl-)?Mod-(?:Alt-)?(?:Shift-)?[a-z0-9]$/

type ChordEvent = Pick<KeyboardEvent, 'code' | 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>

// The physical key (the letter or digit) of a keystroke, lower case: on a Mac, ⌥1 types "¡"
// and ⇧1 types "!", but the key is still 1.
function chordKey(e: Pick<KeyboardEvent, 'code' | 'key'>): string {
  const letter = /^Key([A-Z])$/.exec(e.code)?.[1]
  if (letter) return letter.toLowerCase()
  const digit = /^(?:Digit|Numpad)(\d)$/.exec(e.code)?.[1]
  return digit ?? e.key.toLowerCase()
}

// The chord a keystroke makes, or null when it can't be a style shortcut: no ⌘ (Ctrl
// elsewhere), or no letter or digit.
export function chordOfEvent(e: ChordEvent, mac: boolean): string | null {
  const mod = mac ? e.metaKey : e.ctrlKey
  if (!mod) return null
  const chord = [mac && e.ctrlKey ? 'Ctrl' : null, 'Mod', e.altKey ? 'Alt' : null, e.shiftKey ? 'Shift' : null, chordKey(e)].filter(Boolean).join('-')
  return STYLE_CHORD.test(chord) ? chord : null
}

// Whether a keystroke is the chord, modifiers matching exactly.
export function eventIsChord(e: ChordEvent, chord: string, mac: boolean): boolean {
  return chordOfEvent(e, mac) === chord
}

// The chord as people read it: ⌃⌘⌥⇧1 on a Mac, Ctrl+Alt+Shift+1 elsewhere.
export function chordLabel(chord: string, mac: boolean): string {
  const parts = chord.split('-')
  const key = (parts.pop() ?? '').toUpperCase()
  const glyphs = parts.map((part) => ({ Ctrl: '⌃', Mod: '⌘', Alt: '⌥', Shift: '⇧' })[part] ?? '').join('')
  return platformKeys(`${glyphs}${key}`, mac)
}

// The label of what already uses a chord in the editor (a toolbar key, a key TipTap or the
// browser gives a meaning to, or a style's default), or null when it is free. The person's
// own chord still wins, but the Style shortcuts dialog says what it takes over.
export function chordClash(chord: string, mac: boolean): string | null {
  const wanted = chord.toLowerCase()
  const same = (key: string | null) => key?.toLowerCase() === wanted
  const bound = EDITOR_SHORTCUTS.find((s) => !s.pending && same(tiptapFor(s, mac)))
  if (bound) return bound.label
  const inherited = INHERITED_SHORTCUTS.find((s) => s.tiptap.some(same))
  if (inherited) return inherited.label
  const style = PARAGRAPH_STYLE_SHORTCUTS.find((s) => same(s.tiptap))
  return style ? styleById(style.style).label : null
}
