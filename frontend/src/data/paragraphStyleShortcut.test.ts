import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { PARAGRAPH_STYLES, styleById } from './paragraphStyle'
import { OTHER_HEADING_SHORTCUTS, PARAGRAPH_STYLE_SHORTCUTS, duplicateStyleShortcuts, shortcutOfStyle, styleShortcutRows } from './paragraphStyleShortcut'

// Keys the editor gives to something else (TipTap's defaults, and the Apple Notes
// map in docs/keyboard-shortcuts.md that the editor is being moved to), so a
// style never takes one of them. ⌘⌥1 to ⌘⌥5 are the headings, and ⌘⌥0 is Body. ⌘⇧M
// is the code block, which Monospace is to become (Alex, 2026-11-09), so Monospace
// has no key of its own.
const KEYS_FOR_OTHER_THINGS = [
  'Mod-Alt-4', 'Mod-Alt-5', // Heading 4 and 5
  'Mod-Shift-m', // code block
  'Mod-Alt-c', 'Mod-Alt-t', 'Mod-Alt-m', // code block today, table, comment
  'Mod-Shift-7', 'Mod-Shift-8', 'Mod-Shift-9', // lists
  'Mod-Shift-t', 'Mod-Shift-h', 'Mod-Shift-j', 'Mod-Shift-b', 'Mod-Shift-l', 'Mod-Shift-x', 'Mod-Shift-s',
  'Mod-b', 'Mod-i', 'Mod-u', 'Mod-e', 'Mod-k', 'Mod-z', 'Mod-y', 'Mod-]', 'Mod-[', 'Mod-\\',
]

test('no two styles share a keystroke and no style has two', () => {
  expect(duplicateStyleShortcuts()).toEqual([])
  const styles = PARAGRAPH_STYLE_SHORTCUTS.map((s) => s.style)
  expect(new Set(styles).size).toBe(styles.length)
})

test('every shortcut is for a built-in style and is Cmd+Opt plus a digit, so never a browser-reserved N, T or W', () => {
  const ids = PARAGRAPH_STYLES.map((s) => s.id)
  for (const shortcut of PARAGRAPH_STYLE_SHORTCUTS) {
    expect(ids).toContain(shortcut.style)
    expect(shortcut.tiptap).toMatch(/^Mod-Alt-\d$/)
    expect(shortcut.keys).toBe(`⌘⌥${shortcut.tiptap.slice(-1)}`)
  }
})

test('Monospace has no key while Cmd+Shift+M is the code block', () => {
  expect(shortcutOfStyle('monospace')).toBeUndefined()
})

test('headings keep their TipTap key, Mod-Alt plus the level', () => {
  const headings = PARAGRAPH_STYLE_SHORTCUTS.filter((s) => s.boundBy === 'heading')
  expect(headings.map((s) => s.style)).toEqual(['heading1', 'heading2', 'heading3'])
  for (const shortcut of headings) expect(shortcut.tiptap).toBe(`Mod-Alt-${styleById(shortcut.style).heading}`)
})

test('Title, Subtitle, Body and Quote are bound here; Caption and Monospace have no key yet', () => {
  const bound = PARAGRAPH_STYLE_SHORTCUTS.filter((s) => s.boundBy === 'styles')
  expect(bound.map((s) => [s.style, s.keys])).toEqual([['title', '⌘⌥7'], ['subtitle', '⌘⌥8'], ['body', '⌘⌥0'], ['quote', '⌘⌥9']])
  expect(shortcutOfStyle('caption')).toBeUndefined()
  expect(shortcutOfStyle('heading2')?.keys).toBe('⌘⌥2')
})

test('Headings 4 and 5 have TipTap\'s keys, outside the Style menu', () => {
  expect(OTHER_HEADING_SHORTCUTS).toEqual([
    { label: 'Heading 4', keys: '⌘⌥4' }, { label: 'Heading 5', keys: '⌘⌥5' },
  ])
})

test('the shortcuts sheet lists every style with a key, then the other headings, each key once', () => {
  const rows = styleShortcutRows()
  expect(rows.map((r) => r.label)).toEqual(['Title', 'Subtitle', 'Heading 1', 'Heading 2', 'Heading 3', 'Body', 'Quote', 'Heading 4', 'Heading 5'])
  expect(new Set(rows.map((r) => r.keys)).size).toBe(rows.length)
})

test('no style takes a key another editor shortcut uses', () => {
  for (const shortcut of PARAGRAPH_STYLE_SHORTCUTS) expect(KEYS_FOR_OTHER_THINGS).not.toContain(shortcut.tiptap)
})

// The shortcuts doc, found from wherever the tests run (frontend/ under Jest, the repo root elsewhere).
function shortcutsDoc(): string {
  let dir = process.cwd()
  for (let up = 0; up < 4; up++) {
    const file = resolve(dir, 'docs/keyboard-shortcuts.md')
    if (existsSync(file)) return readFileSync(file, 'utf8')
    dir = resolve(dir, '..')
  }
  throw new Error('docs/keyboard-shortcuts.md not found')
}

test('docs/keyboard-shortcuts.md lists every style shortcut', () => {
  const doc = shortcutsDoc()
  for (const shortcut of PARAGRAPH_STYLE_SHORTCUTS) expect(doc).toContain(`\`${shortcut.keys}\``)
  for (const heading of OTHER_HEADING_SHORTCUTS) expect(doc).toContain(`\`${heading.keys}\``)
})
