// Appearance choices: light, dark or follow the system, and an accent colour.
export type ThemeChoice = 'system' | 'light' | 'dark'

export const THEME_CHOICES: { value: ThemeChoice; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

// Accent presets by hue; 'teal' is Inertia's own theme (_theme.scss), so choosing
// it applies no override.
export const ACCENTS = [
  { id: 'teal', label: 'Teal', hue: 174 },
  { id: 'blue', label: 'Blue', hue: 217 },
  { id: 'purple', label: 'Purple', hue: 262 },
  { id: 'pink', label: 'Pink', hue: 330 },
  { id: 'orange', label: 'Orange', hue: 24 },
  { id: 'green', label: 'Green', hue: 142 },
  { id: 'red', label: 'Red', hue: 0 },
] as const

export type AccentId = (typeof ACCENTS)[number]['id']

export interface Appearance { theme: ThemeChoice; accent: AccentId }

export const DEFAULT_APPEARANCE: Appearance = { theme: 'system', accent: 'teal' }

// Whether the page is dark given the choice and the system preference.
export function isDark(theme: ThemeChoice, systemPrefersDark: boolean): boolean {
  return theme === 'dark' || (theme === 'system' && systemPrefersDark)
}

// The `data-theme` attribute value: unset follows the system (what the CSS does without it).
export function themeAttribute(theme: ThemeChoice): 'light' | 'dark' | null {
  return theme === 'system' ? null : theme
}

// Volta accent tokens for a preset, using the same lightness steps as _theme.scss
// (light: 32%/27%, dark: 42%/36%). Null for the default accent: no override.
export function accentProperties(accent: AccentId, dark: boolean): Record<string, string> | null {
  if (accent === 'teal') return null
  const hue = ACCENTS.find((a) => a.id === accent)?.hue
  if (hue === undefined) return null
  return dark
    ? { '--v-accent': `hsl(${hue}deg 72% 42%)`, '--v-accent-hover': `hsl(${hue}deg 72% 36%)`, '--v-accent-subtle': `hsl(${hue}deg 15% 18%)` }
    : { '--v-accent': `hsl(${hue}deg 72% 32%)`, '--v-accent-hover': `hsl(${hue}deg 72% 27%)`, '--v-accent-subtle': `hsl(${hue}deg 30% 90%)` }
}

export const ACCENT_PROPERTY_NAMES = ['--v-accent', '--v-accent-hover', '--v-accent-subtle'] as const
