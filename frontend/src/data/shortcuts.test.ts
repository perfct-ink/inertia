import { readFileSync } from 'node:fs'
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
  const doc = readFileSync(path.resolve(process.cwd(), '../docs/keyboard-shortcuts.md'), 'utf8')
  for (const shortcut of EDITOR_SHORTCUTS) {
    expect(doc.includes(shortcut.keys)).toBe(true)
    expect(doc.includes(shortcut.label)).toBe(true)
  }
})
