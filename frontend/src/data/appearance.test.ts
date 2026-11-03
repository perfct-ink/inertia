import { COLOR_THEMES, accentProperties, DEFAULT_APPEARANCE, isDark, sidebarColor, sidebarProperties, themeAttribute } from './appearance'

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

test('teal themes add no accent override; others set the three tokens for the mode', () => {
  expect(DEFAULT_APPEARANCE).toEqual({ theme: 'system', colorTheme: 'teal' })
  expect(accentProperties('teal', false)).toBeNull()
  expect(accentProperties('midnight', true)).toBeNull()
  expect(accentProperties('blue', false)).toEqual({ '--v-accent': 'hsl(217deg 72% 32%)', '--v-accent-hover': 'hsl(217deg 72% 27%)', '--v-accent-subtle': 'hsl(217deg 30% 90%)' })
  expect(accentProperties('blue', true)?.['--v-accent']).toBe('hsl(217deg 72% 42%)')
})

test('the default theme keeps the plain sidebar; others tint it, deeper in dark mode', () => {
  expect(sidebarColor('teal', false)).toBeNull()
  expect(sidebarProperties('teal', true)).toBeNull()
  expect(sidebarColor('blue', false)).toBe('hsl(217deg 50% 24%)')
  expect(sidebarColor('blue', true)).toBe('hsl(217deg 50% 18%)')
  expect(sidebarProperties('blue', false)).toMatchObject({ '--sidebar-background': 'hsl(217deg 50% 24%)', '--sidebar-foreground': 'hsl(217deg 20% 96%)' })
})

test('every theme has a unique id and label', () => {
  expect(new Set(COLOR_THEMES.map((t) => t.id)).size).toBe(COLOR_THEMES.length)
  expect(new Set(COLOR_THEMES.map((t) => t.label)).size).toBe(COLOR_THEMES.length)
})
