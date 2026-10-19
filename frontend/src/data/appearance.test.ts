import { ACCENTS, accentProperties, DEFAULT_APPEARANCE, isDark, themeAttribute } from './appearance'

test('system follows the OS; light and dark are fixed', () => {
  expect(isDark('system', true)).toBe(true)
  expect(isDark('system', false)).toBe(false)
  expect(isDark('light', true)).toBe(false)
  expect(isDark('dark', false)).toBe(true)
})

test('only an explicit choice sets data-theme', () => {
  expect(themeAttribute('system')).toBeNull()
  expect(themeAttribute('light')).toBe('light')
  expect(themeAttribute('dark')).toBe('dark')
})

test('the default accent adds no override; others set the three tokens for the scheme', () => {
  expect(DEFAULT_APPEARANCE).toEqual({ theme: 'system', accent: 'teal' })
  expect(accentProperties('teal', false)).toBeNull()
  expect(accentProperties('blue', false)).toEqual({ '--v-accent': 'hsl(217deg 72% 32%)', '--v-accent-hover': 'hsl(217deg 72% 27%)', '--v-accent-subtle': 'hsl(217deg 30% 90%)' })
  expect(accentProperties('blue', true)?.['--v-accent']).toBe('hsl(217deg 72% 42%)')
})

test('every preset has a unique id and hue', () => {
  expect(new Set(ACCENTS.map((a) => a.id)).size).toBe(ACCENTS.length)
  expect(new Set(ACCENTS.map((a) => a.hue)).size).toBe(ACCENTS.length)
})
