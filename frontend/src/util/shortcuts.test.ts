import { isShortcut, shortcutAvailable, shortcutKey, shortcutLabel } from './shortcuts'

const press = (code: string, mods: { meta?: boolean; alt?: boolean; key?: string } = {}) =>
  ({ code, key: mods.key ?? code.replace('Key', '').toLowerCase(), metaKey: mods.meta ?? true, ctrlKey: false, altKey: mods.alt ?? false })

test('reads the physical key, so ⌥N and ⇧/ still count as N and /', () => {
  expect(shortcutKey({ code: 'KeyN', key: '˜' })).toBe('n')
  expect(shortcutKey({ code: 'Slash', key: '?' })).toBe('/')
})

test('in a browser, the shortcuts it keeps for itself need ⌥; others do not', () => {
  expect(isShortcut(press('KeyN'), 'n', false)).toBe(false)
  expect(isShortcut(press('KeyN', { alt: true, key: '˜' }), 'n', false)).toBe(true)
  expect(isShortcut(press('KeyT', { alt: true }), 't', false)).toBe(true)
  expect(isShortcut(press('KeyK'), 'k', false)).toBe(true)
  expect(isShortcut(press('KeyK', { meta: false }), 'k', false)).toBe(false)
})

test('the Electron app and Mac shell get the plain ⌘ shortcuts', () => {
  expect(isShortcut(press('KeyN'), 'n', true)).toBe(true)
  expect(shortcutLabel('⌘N', true)).toBe('⌘N')
})

test('⌘W only works where the app gets it, never with ⌥ in a browser', () => {
  expect(shortcutAvailable('⌘W', false)).toBe(false)
  expect(shortcutAvailable('⌘W', true)).toBe(true)
  expect(shortcutLabel('⌘W', true)).toBe('⌘W')
})

test('labels show ⌥ where a browser needs it', () => {
  expect(shortcutLabel('⌘N', false)).toBe('⌥⌘N')
  expect(shortcutLabel('⌘⇧N', false)).toBe('⌥⌘⇧N')
  expect(shortcutLabel('⌘K', false)).toBe('⌘K')
})
