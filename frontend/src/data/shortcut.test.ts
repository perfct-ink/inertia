import { KEYBOARD_SHORTCUTS } from './shortcut'

test('every shortcut has its own keys and a label', () => {
  expect(KEYBOARD_SHORTCUTS.length).toBeGreaterThan(0)
  expect(new Set(KEYBOARD_SHORTCUTS.map((s) => s.keys)).size).toBe(KEYBOARD_SHORTCUTS.length)
  expect(KEYBOARD_SHORTCUTS.every((s) => s.keys.length > 0 && s.label.length > 0)).toBe(true)
})

test('the list opens with quick add and ends with Escape', () => {
  expect(KEYBOARD_SHORTCUTS[0].keys).toBe('⌘K')
  expect(KEYBOARD_SHORTCUTS[KEYBOARD_SHORTCUTS.length - 1].keys).toBe('Esc')
})
