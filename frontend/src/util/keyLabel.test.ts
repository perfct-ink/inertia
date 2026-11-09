import { platformKeys, windowsKeys } from './keyLabel'

test('⌘ becomes Ctrl and the modifiers follow the Windows order', () => {
  expect(windowsKeys('⌘⇧X')).toBe('Ctrl+Shift+X')
  expect(windowsKeys('⌘K')).toBe('Ctrl+K')
  expect(windowsKeys('⌥⌘N')).toBe('Ctrl+Alt+N')
  expect(windowsKeys('⌥⌘⇧N')).toBe('Ctrl+Alt+Shift+N')
  expect(windowsKeys('⌘⌥1–5')).toBe('Ctrl+Alt+1–5')
})

test('punctuation and arrows keep their glyph', () => {
  expect(windowsKeys('⌘]')).toBe('Ctrl+]')
  expect(windowsKeys('⌘\\')).toBe('Ctrl+\\')
  expect(windowsKeys('⇧↑')).toBe('Shift+↑')
})

test('⌃ and ⌘ together are one Ctrl', () => {
  expect(windowsKeys('⌃⌘↑')).toBe('Ctrl+↑')
})

test('text with no modifier glyphs is left alone', () => {
  expect(windowsKeys('Esc')).toBe('Esc')
  expect(windowsKeys('Shift+Enter')).toBe('Shift+Enter')
})

test('a Mac keeps the Mac form', () => {
  expect(platformKeys('⌘⇧X', true)).toBe('⌘⇧X')
  expect(platformKeys('⌘⇧X', false)).toBe('Ctrl+Shift+X')
})
