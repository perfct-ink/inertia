import { GLOBAL_CLASHES } from '@/data/editorShortcut'
import { isElectron, isMacShell } from './platform'

// Browsers keep ⌘N, ⇧⌘N and ⌘T for their own windows and tabs and never hand
// them to the page, so in a browser these shortcuts also take ⌥. The Electron
// app and the Mac shell pass them on, so there ⌘ alone works.
const BROWSER_KEYS = new Set(['n', 't'])
// ⌘W closes the browser's tab, and ⌥⌘W closes all the others in Safari, so a
// browser has no safe version of it at all.
const BROWSER_ONLY_KEYS = new Set(['w'])

export const appGetsBrowserKeys = isElectron || isMacShell

type Keys = Pick<KeyboardEvent, 'code' | 'key' | 'metaKey' | 'ctrlKey' | 'altKey'>

// The key a shortcut is bound to, from the physical key: on a Mac, ⌥N types
// "˜" and ⇧/ types "?", but they are still N and /.
export function shortcutKey(e: Pick<KeyboardEvent, 'code' | 'key'>): string {
  const letter = /^Key([A-Z])$/.exec(e.code)?.[1]
  if (letter) return letter.toLowerCase()
  if (e.code === 'Slash') return '/'
  return e.key.toLowerCase()
}

// Whether `e` is the ⌘ (or Ctrl) shortcut for `key`, needing ⌥ too when a
// browser would keep the plain one.
export function isShortcut(e: Keys, key: string, appGetsKeys = appGetsBrowserKeys): boolean {
  if (!(e.metaKey || e.ctrlKey) || shortcutKey(e) !== key) return false
  return appGetsKeys || !BROWSER_KEYS.has(key) || e.altKey
}

// Whether a shortcut works here at all (⌘W doesn't in a browser).
export function shortcutAvailable(keys: string, appGetsKeys = appGetsBrowserKeys): boolean {
  return appGetsKeys || !BROWSER_ONLY_KEYS.has(keys.slice(-1).toLowerCase())
}

// A shortcut as people should press it here: "⌘N" reads "⌥⌘N" in a browser.
export function shortcutLabel(keys: string, appGetsKeys = appGetsBrowserKeys): string {
  return !appGetsKeys && BROWSER_KEYS.has(keys.slice(-1).toLowerCase()) ? `⌥${keys}` : keys
}

// Whether `e` is the chord named like a TipTap key ("Mod-k", "Mod-Alt-t"): Mod is ⌘ or
// Ctrl, and Shift and Alt must match exactly.
export function matchesChord(e: Keys & Partial<Pick<KeyboardEvent, 'shiftKey'>>, tiptap: string): boolean {
  const parts = tiptap.split('-')
  const key = (parts.pop() ?? '').toLowerCase()
  return parts.includes('Mod') === (e.metaKey || e.ctrlKey)
    && parts.includes('Alt') === e.altKey
    && parts.includes('Shift') === Boolean(e.shiftKey)
    && shortcutKey(e) === key
}

// Whether the keystroke happened inside the document editor (the only rich text editor).
export function inDocumentEditor(e: { target?: EventTarget | null }): boolean {
  return e.target instanceof Element && e.target.closest('.ProseMirror') !== null
}

// Whether a global shortcut must stand aside: the keystroke is in the document editor and
// is a chord the editor binds as well (⌘K link, ⌘E code, ⌥⌘T table). Formatting wins there;
// everywhere else the global one runs.
export function editorKeepsKey(e: Keys & Partial<Pick<KeyboardEvent, 'shiftKey' | 'target'>>): boolean {
  return inDocumentEditor(e) && GLOBAL_CLASHES.some((clash) => matchesChord(e, clash.tiptap))
}

