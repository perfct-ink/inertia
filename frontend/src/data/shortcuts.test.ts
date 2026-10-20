import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { duplicateShortcuts, EDITOR_SHORTCUTS, REPLACED_DEFAULTS } from './shortcuts'

test('no keystroke is bound twice, and every action appears once', () => {
  expect(duplicateShortcuts()).toEqual([])
  expect(new Set(EDITOR_SHORTCUTS.map((s) => s.action)).size).toBe(EDITOR_SHORTCUTS.length)
})

test('the defaults being replaced belong to the four extensions the editor wraps', () => {
  expect([...new Set(REPLACED_DEFAULTS.map(([name]) => name))].sort()).toEqual(['bulletList', 'codeBlock', 'orderedList', 'strike'])
})

test('the keyboard shortcuts doc lists every editor shortcut with its keys', () => {
  // Jest runs from frontend/; a runner at the repo root works too.
  const file = ['../docs/keyboard-shortcuts.md', 'docs/keyboard-shortcuts.md'].map((p) => path.resolve(process.cwd(), p)).find((p) => existsSync(p)) as string
  const doc = readFileSync(file, 'utf8')
  for (const shortcut of EDITOR_SHORTCUTS) {
    expect(doc.includes(shortcut.keys)).toBe(true)
    expect(doc.includes(shortcut.label)).toBe(true)
  }
})
