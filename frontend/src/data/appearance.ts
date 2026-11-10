// Appearance choices: a mode (light, dark or follow the system) and a colour
// theme, which sets the accent and can tint the sidebar, as in Slack.
import { contrastRatio, parseColor } from '@/util/cssColor'

export type ThemeChoice = 'system' | 'light' | 'dark'

export const THEME_CHOICES: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

// A sidebar tint: a deep colour the rail and panel are drawn in, with light text.
interface SidebarTint { hue: number; saturation: number; lightness: number }

// The hue of Inertia's own accent, the blue in _theme.scss.
const DEFAULT_HUE = 217

// Colour themes. `hue` is the accent; `sidebar` tints the sidebar, or null for
// the plain one. 'teal' is Inertia's own theme (_theme.scss), so choosing it
// applies no override; it is blue now but keeps its id so saved choices load. The ids of the first seven are the earlier accent
// presets, so a saved accent keeps its colour.
export const COLOR_THEMES = [
  { id: 'teal', label: 'Inertia', hue: DEFAULT_HUE, sidebar: null },
  { id: 'midnight', label: 'Midnight', hue: DEFAULT_HUE, sidebar: { hue: 224, saturation: 40, lightness: 15 } },
  { id: 'blue', label: 'Harbor', hue: 217, sidebar: { hue: 217, saturation: 50, lightness: 24 } },
  { id: 'purple', label: 'Plum', hue: 262, sidebar: { hue: 285, saturation: 35, lightness: 24 } },
  { id: 'pink', label: 'Rose', hue: 330, sidebar: { hue: 335, saturation: 40, lightness: 26 } },
  { id: 'red', label: 'Crimson', hue: 0, sidebar: { hue: 355, saturation: 45, lightness: 25 } },
  { id: 'orange', label: 'Ember', hue: 24, sidebar: { hue: 18, saturation: 45, lightness: 24 } },
  { id: 'green', label: 'Moss', hue: 142, sidebar: { hue: 150, saturation: 30, lightness: 20 } },
  { id: 'graphite', label: 'Graphite', hue: 217, sidebar: { hue: 220, saturation: 8, lightness: 21 } },
] as const satisfies readonly { id: string; label: string; hue: number; sidebar: SidebarTint | null }[]

export type ColorThemeId = (typeof COLOR_THEMES)[number]['id']

export interface Appearance { theme: ThemeChoice; colorTheme: ColorThemeId }

export const DEFAULT_APPEARANCE: Appearance = { theme: 'system', colorTheme: 'teal' }

function findTheme(id: ColorThemeId) {
  return COLOR_THEMES.find((t) => t.id === id)
}

// Whether the page is dark given the choice and the system preference.
export function isDark(theme: ThemeChoice, systemPrefersDark: boolean): boolean {
  return theme === 'dark' || (theme === 'system' && systemPrefersDark)
}

// The `data-theme` attribute value: unset follows the system (what the CSS does without it).
export function themeAttribute(theme: ThemeChoice): 'light' | 'dark' | null {
  return theme === 'system' ? null : theme
}

// Text on the accent: white, or the dark page color for an accent white can't
// read on (WCAG AA is 4.5:1).
const ON_ACCENT_LIGHT = '#fff'
const ON_ACCENT_DARK = 'hsl(222deg 32% 10%)'
const AA_TEXT = 4.5

// The accent's lightness: 32% in light and 42% in dark, with light mode
// deepened a step at a time until white text on it reaches AA (Moss at 32% is 4.3:1).
export function accentLightness(hue: number, dark: boolean): number {
  if (dark) return 42
  let lightness = 32
  while (lightness > 20 && contrastRatio(parseColor(ON_ACCENT_LIGHT), parseColor(`hsl(${hue}deg 72% ${lightness}%)`)) < AA_TEXT) lightness--
  return lightness
}

// The hover lightness: 27% in light and 36% in dark, never lighter than the accent.
function accentHoverLightness(hue: number, dark: boolean): number {
  return Math.min(dark ? 36 : 27, accentLightness(hue, dark) - 2)
}

// The accent colour itself, for a theme's swatch or preview.
export function accentColor(hue: number, dark: boolean): string {
  return `hsl(${hue}deg 72% ${accentLightness(hue, dark)}%)`
}

// The text color on a theme's accent and its hover shade: white unless the dark
// page color reads better on both (Moss in dark mode).
export function onAccentColor(hue: number, dark: boolean): string {
  const shades = [accentLightness(hue, dark), accentHoverLightness(hue, dark)].map((l) => parseColor(`hsl(${hue}deg 72% ${l}%)`))
  const worst = (text: string) => Math.min(...shades.map((shade) => contrastRatio(parseColor(text), shade)))
  return worst(ON_ACCENT_DARK) > worst(ON_ACCENT_LIGHT) ? ON_ACCENT_DARK : ON_ACCENT_LIGHT
}

// Volta accent tokens for a theme, using the same lightness steps as _theme.scss
// (light: 32%/27%, dark: 42%/36%), and the text color that reads on them. Null for a theme with Inertia's own accent:
// _theme.scss already sets it.
export function accentProperties(id: ColorThemeId, dark: boolean): Record<string, string> | null {
  const hue = findTheme(id)?.hue
  if (hue === undefined || hue === DEFAULT_HUE) return null
  return {
    '--v-accent': accentColor(hue, dark),
    '--v-accent-hover': `hsl(${hue}deg 72% ${accentHoverLightness(hue, dark)}%)`,
    '--v-accent-subtle': dark ? `hsl(${hue}deg 15% 18%)` : `hsl(${hue}deg 30% 90%)`,
    '--primary-foreground': onAccentColor(hue, dark),
  }
}

// The sidebar's background for a theme (a little deeper in dark mode), or null
// for the plain sidebar.
export function sidebarColor(id: ColorThemeId, dark: boolean): string | null {
  const tint = findTheme(id)?.sidebar
  if (!tint) return null
  return `hsl(${tint.hue}deg ${tint.saturation}% ${tint.lightness - (dark ? 6 : 0)}%)`
}

// Tokens the tinted sidebar is drawn with (Sidebar.scss reads them when
// <html> has data-sidebar="tinted"). Null for the plain sidebar.
export function sidebarProperties(id: ColorThemeId, dark: boolean): Record<string, string> | null {
  const tint = findTheme(id)?.sidebar
  if (!tint) return null
  const { hue, saturation } = tint
  const lightness = tint.lightness - (dark ? 6 : 0)
  const shade = (l: number) => `hsl(${hue}deg ${saturation}% ${l}%)`
  return {
    '--sidebar-background': shade(lightness),
    '--sidebar-hover': shade(lightness + 10),
    '--sidebar-border': shade(lightness + 8),
    '--sidebar-field': shade(Math.max(lightness - 3, 4)),
    '--sidebar-foreground': `hsl(${hue}deg 20% 96%)`,
    '--sidebar-muted-foreground': `hsl(${hue}deg 15% 76%)`,
  }
}

export const APPEARANCE_PROPERTY_NAMES = [
  '--v-accent', '--v-accent-hover', '--v-accent-subtle', '--primary-foreground',
  '--sidebar-background', '--sidebar-hover', '--sidebar-border', '--sidebar-field',
  '--sidebar-foreground', '--sidebar-muted-foreground',
] as const
