// A keystroke as people read it on this platform. The tables hold the Mac form
// (⌘⇧X); on Windows and Linux ⌘ is Ctrl, so the same keystroke reads "Ctrl+Shift+X".
// Pure, so data files and tests can use it without a browser.

const MODIFIER_NAMES: Record<string, string> = { '⌃': 'Ctrl', '⌘': 'Ctrl', '⌥': 'Alt', '⇧': 'Shift' }
// The order Windows and Linux menus write modifiers in.
const MODIFIER_ORDER = ['Ctrl', 'Alt', 'Shift']

// "⌘⇧X" as "Ctrl+Shift+X". Text with no modifier glyphs ("Esc", "Shift+Enter") is already
// platform neutral and comes back as it was.
export function windowsKeys(keys: string): string {
  const modifiers = new Set<string>()
  let rest = keys
  while (rest && MODIFIER_NAMES[rest[0]]) {
    modifiers.add(MODIFIER_NAMES[rest[0]])
    rest = rest.slice(1)
  }
  if (modifiers.size === 0) return keys
  return [...MODIFIER_ORDER.filter((name) => modifiers.has(name)), rest].join('+')
}

// The label for the platform: the Mac form on a Mac, the Windows and Linux form elsewhere.
export function platformKeys(keys: string, mac: boolean): string {
  return mac ? keys : windowsKeys(keys)
}
