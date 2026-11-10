import { readFileSync } from 'fs'
import { join } from 'path'
import { contrastRatio, mixColors, parseColor } from '@/util/cssColor'
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

test('themes with the default blue add no accent override; others set the three tokens for the mode', () => {
  expect(DEFAULT_APPEARANCE).toEqual({ theme: 'system', colorTheme: 'teal' })
  expect(accentProperties('teal', false)).toBeNull()
  expect(accentProperties('midnight', true)).toBeNull()
  expect(accentProperties('blue', false)).toBeNull()
  expect(accentProperties('purple', false)).toEqual({ '--v-accent': 'hsl(262deg 72% 32%)', '--v-accent-hover': 'hsl(262deg 72% 27%)', '--v-accent-subtle': 'hsl(262deg 30% 90%)', '--primary-foreground': '#fff' })
  expect(accentProperties('purple', true)?.['--v-accent']).toBe('hsl(262deg 72% 42%)')
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

// Text on the accent (buttons, the selected day, the active filter) must read at
// WCAG AA, 4.5:1, on the accent and its hover shade, for every theme in both modes.
describe('text on the accent', () => {
  const theme = readFileSync(join(__dirname, '..', 'styles', '_theme.scss'), 'utf8')
  const cssValue = (block: string, name: string) => new RegExp(`${block}[\\s\\S]*?${name}:\\s*([^;]+);`).exec(theme)![1]
  const AA_TEXT = 4.5

  test('the default theme draws white on its accent in light and dark', () => {
    const text = parseColor(cssValue(':root', '--primary-foreground'))
    const lightAccent = parseColor(cssValue(':root', '--v-accent'))
    const darkAccent = parseColor(cssValue('dark-scheme', '--v-accent'))
    expect(contrastRatio(text, lightAccent)).toBeGreaterThanOrEqual(AA_TEXT)
    expect(contrastRatio(text, darkAccent)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  test.each(COLOR_THEMES.flatMap((t) => [[t.id, false], [t.id, true]] as const))('%s (dark: %s) reads on its accent and hover', (id, dark) => {
    const hue = COLOR_THEMES.find((t) => t.id === id)!.hue
    const properties = accentProperties(id, dark) ?? {}
    const text = parseColor(properties['--primary-foreground'] ?? '#fff')
    const accent = parseColor(properties['--v-accent'] ?? `hsl(217deg 72% ${dark ? 42 : 32}%)`)
    const hover = parseColor(properties['--v-accent-hover'] ?? `hsl(217deg 72% ${dark ? 36 : 27}%)`)
    expect(hue).toBeGreaterThanOrEqual(0)
    expect(contrastRatio(text, accent)).toBeGreaterThanOrEqual(AA_TEXT)
    expect(contrastRatio(text, hover)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  test('light mode keeps the accent lightness except where white would fail', () => {
    expect(accentProperties('purple', false)?.['--v-accent']).toBe('hsl(262deg 72% 32%)')
    expect(accentProperties('green', false)?.['--v-accent']).toBe('hsl(142deg 72% 31%)')
    expect(accentProperties('green', true)?.['--primary-foreground']).toBe('hsl(222deg 32% 10%)')
  })

  test('the dark focus ring reads at 3:1 on the page for every theme', () => {
    const page = parseColor(cssValue('dark-scheme', '--v-color-base'))
    const trim = parseColor(cssValue('dark-scheme', '--v-color-trim'))
    expect(cssValue('dark-scheme', '--focus-ring')).toBe('color-mix(in srgb, var(--primary) 60%, var(--v-color-trim))')
    COLOR_THEMES.forEach(({ id, hue }) => {
      const accent = parseColor(accentProperties(id, true)?.['--v-accent'] ?? `hsl(${hue}deg 72% 42%)`)
      expect(contrastRatio(mixColors(accent, 60, trim), page)).toBeGreaterThanOrEqual(3)
    })
  })

  test('the light focus ring is the accent on the page', () => {
    expect(theme).toContain('--focus-ring: var(--primary);')
    COLOR_THEMES.forEach(({ id, hue }) => {
      const accent = parseColor(accentProperties(id, false)?.['--v-accent'] ?? `hsl(${hue}deg 72% 32%)`)
      expect(contrastRatio(accent, [255, 255, 255])).toBeGreaterThanOrEqual(3)
    })
  })
})
