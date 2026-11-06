import { PARAGRAPH_STYLES } from './paragraphStyle'

// Custom paragraph styles: a person's own named styles. A style is a built-in
// paragraph style (its `base`) with a small set of formatting properties laid
// on top. The styles are saved per user (api/paragraphStyles.ts); the allowed
// values are mirrored in backend/app/models/paragraph_style.rb. KEEP IN SYNC.
//
// A paragraph in a document that uses one stores two attributes: `style`, the
// reference "custom-<id>", and `styleProps`, a copy of the resolved formatting
// (the base plus the properties, kept flat so collaboration can compare it).
// The copy is what is drawn, so the paragraph looks the same to everyone,
// whether or not the viewer has the style, and whatever happens to the style.
// See extensions/CustomParagraphStyle.ts and docs/features/paragraph_styles.md.

export const CUSTOM_STYLE_PREFIX = 'custom-'
export const STYLE_NAME_MAX = 40
export const MAX_CUSTOM_STYLES = 50

// The built-in styles a custom style can build on: the paragraph styles
// (headings are heading nodes, so they can't carry a custom style).
export const STYLE_BASES = ['body', 'title', 'subtitle', 'quote', 'caption', 'monospace'] as const
export type StyleBase = (typeof STYLE_BASES)[number]

export const STYLE_FONTS = ['sans', 'serif', 'mono'] as const
export const STYLE_WEIGHTS = [400, 500, 600, 700] as const
export const STYLE_ALIGNMENTS = ['left', 'center', 'right', 'justify'] as const
export const STYLE_SIZE_RANGE = { min: 8, max: 96 } as const
export const STYLE_SPACING_RANGE = { min: 1, max: 3 } as const
const COLOR = /^#[0-9a-fA-F]{6}$/

export interface StyleProperties {
  font?: (typeof STYLE_FONTS)[number]
  // Font size in px.
  size?: number
  weight?: (typeof STYLE_WEIGHTS)[number]
  // #rrggbb
  color?: string
  // Line spacing, as a multiple of the font size.
  spacing?: number
  align?: (typeof STYLE_ALIGNMENTS)[number]
}

// A custom style as the API returns it.
export interface CustomParagraphStyle {
  id: number
  name: string
  base: StyleBase
  properties: StyleProperties
  created_at?: string
}

export interface CustomParagraphStyleInput {
  name: string
  base: StyleBase
  properties: StyleProperties
}

// The formatting a paragraph carries (its `styleProps` attribute).
export type StyleSnapshot = StyleProperties & { base: StyleBase }

// What the style form offers. Choices outside these are valid but have no control.
export const STYLE_BASE_LABELS: Record<StyleBase, string> = {
  body: 'Body', title: 'Title', subtitle: 'Subtitle', quote: 'Quote', caption: 'Caption', monospace: 'Monospace',
}
export const STYLE_FONT_LABELS: Record<(typeof STYLE_FONTS)[number], string> = { sans: 'Sans-serif', serif: 'Serif', mono: 'Monospace' }
export const STYLE_WEIGHT_LABELS: Record<(typeof STYLE_WEIGHTS)[number], string> = { 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold' }
export const STYLE_ALIGNMENT_LABELS: Record<(typeof STYLE_ALIGNMENTS)[number], string> = { left: 'Left', center: 'Center', right: 'Right', justify: 'Justify' }
export const STYLE_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48]
export const STYLE_SPACINGS = [{ value: 1.15, label: 'Tight' }, { value: 1.5, label: 'Normal' }, { value: 1.75, label: 'Relaxed' }, { value: 2, label: 'Double' }]
export const STYLE_COLORS = [
  { value: '#6b7280', label: 'Gray' }, { value: '#dc2626', label: 'Red' }, { value: '#ea580c', label: 'Orange' },
  { value: '#16a34a', label: 'Green' }, { value: '#2563eb', label: 'Blue' }, { value: '#7c3aed', label: 'Purple' },
  { value: '#db2777', label: 'Pink' },
]

const FONT_STACKS: Record<(typeof STYLE_FONTS)[number], string> = {
  sans: 'ui-sans-serif, system-ui, sans-serif',
  serif: 'ui-serif, Georgia, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}

// The value each property must have; anything else is dropped. The same checks
// are made on what a document holds, because that can come from another person.
const RULES: Record<keyof StyleProperties, (value: unknown) => boolean> = {
  font: (v) => (STYLE_FONTS as readonly unknown[]).includes(v),
  size: (v) => Number.isInteger(v) && (v as number) >= STYLE_SIZE_RANGE.min && (v as number) <= STYLE_SIZE_RANGE.max,
  weight: (v) => (STYLE_WEIGHTS as readonly unknown[]).includes(v),
  color: (v) => typeof v === 'string' && COLOR.test(v),
  spacing: (v) => typeof v === 'number' && v >= STYLE_SPACING_RANGE.min && v <= STYLE_SPACING_RANGE.max,
  align: (v) => (STYLE_ALIGNMENTS as readonly unknown[]).includes(v),
}

export function customStyleKey(id: number): string {
  return `${CUSTOM_STYLE_PREFIX}${id}`
}

// The style id a paragraph's `style` attribute refers to, or null when it
// isn't a custom style reference.
export function customStyleIdOfKey(key: unknown): number | null {
  if (typeof key !== 'string' || !key.startsWith(CUSTOM_STYLE_PREFIX)) return null
  const digits = key.slice(CUSTOM_STYLE_PREFIX.length)
  return /^\d+$/.test(digits) ? Number(digits) : null
}

export function isStyleBase(value: unknown): value is StyleBase {
  return (STYLE_BASES as readonly unknown[]).includes(value)
}

// Only the properties with an allowed value.
export function sanitizeProperties(raw: unknown): StyleProperties {
  const result: Record<string, unknown> = {}
  if (raw && typeof raw === 'object') {
    for (const key of Object.keys(RULES) as (keyof StyleProperties)[]) {
      const value = (raw as Record<string, unknown>)[key]
      if (RULES[key](value)) result[key] = value
    }
  }
  return result as StyleProperties
}

// A paragraph's `styleProps` made safe to draw: the base (body when missing or
// unknown) and the allowed properties. Null when it isn't an object.
export function sanitizeSnapshot(raw: unknown): StyleSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const base = (raw as { base?: unknown }).base
  return { base: isStyleBase(base) ? base : 'body', ...sanitizeProperties(raw) }
}

export function snapshotOf(style: Pick<CustomParagraphStyle, 'base' | 'properties'>): StyleSnapshot {
  return { base: style.base, ...sanitizeProperties(style.properties) }
}

// The paragraph attributes that apply a style: the reference and the copy.
export function customStyleAttributes(style: CustomParagraphStyle): { style: string; styleProps: StyleSnapshot } {
  return { style: customStyleKey(style.id), styleProps: snapshotOf(style) }
}

// The formatting a paragraph carries, or null when its style isn't a custom one.
export function snapshotOfBlock(attrs: { style?: unknown; styleProps?: unknown }): StyleSnapshot | null {
  return customStyleIdOfKey(attrs.style) === null ? null : sanitizeSnapshot(attrs.styleProps)
}

// Inline CSS declarations for a snapshot's properties (the base's own look
// comes from the stylesheet, through data-style-base).
export function snapshotCss(snapshot: StyleProperties): string {
  const declarations: string[] = []
  if (snapshot.font) declarations.push(`font-family: ${FONT_STACKS[snapshot.font]}`)
  if (snapshot.size) declarations.push(`font-size: ${snapshot.size}px`)
  if (snapshot.weight) declarations.push(`font-weight: ${snapshot.weight}`)
  if (snapshot.color) declarations.push(`color: ${snapshot.color}`)
  if (snapshot.spacing) declarations.push(`line-height: ${snapshot.spacing}`)
  if (snapshot.align) declarations.push(`text-align: ${snapshot.align}`)
  return declarations.join('; ')
}

// The HTML attributes that draw a custom-styled paragraph, empty for any other
// paragraph. `style` is the paragraph's style reference, `raw` its `styleProps`.
// Everything comes through sanitizeSnapshot, so nothing else reaches the page.
export function customStyleHtmlAttributes(style: unknown, raw: unknown): Record<string, string> {
  const snapshot = snapshotOfBlock({ style, styleProps: raw })
  if (!snapshot) return {}
  const css = snapshotCss(snapshot)
  return {
    'data-style-props': JSON.stringify(snapshot),
    ...(snapshot.base !== 'body' && { 'data-style-base': snapshot.base }),
    ...(css && { style: css }),
  }
}

// Reads a paragraph's styleProps back from its data-style-props attribute.
export function parseSnapshot(text: string | null): StyleSnapshot | null {
  if (!text) return null
  try {
    return sanitizeSnapshot(JSON.parse(text))
  } catch {
    return null
  }
}

// A copy of `properties` with `key` set, or removed when `value` is undefined.
export function withProperty<K extends keyof StyleProperties>(properties: StyleProperties, key: K, value: StyleProperties[K] | undefined): StyleProperties {
  const next: StyleProperties = { ...properties }
  if (value === undefined) delete next[key]
  else next[key] = value
  return next
}

// Why a style can't be saved under `name`, or null when it can. `existing` is
// the person's other custom styles.
export function validateStyleName(name: string, existing: Pick<CustomParagraphStyle, 'name'>[]): string | null {
  const trimmed = name.replace(/\s+/g, ' ').trim()
  if (!trimmed) return 'Give the style a name.'
  if (trimmed.length > STYLE_NAME_MAX) return `Use ${STYLE_NAME_MAX} characters or fewer.`
  const lower = trimmed.toLowerCase()
  if (PARAGRAPH_STYLES.some((s) => s.label.toLowerCase() === lower)) return `${trimmed} is already the name of a built-in style.`
  if (existing.some((s) => s.name.toLowerCase() === lower)) return `You already have a style called ${trimmed}.`
  if (existing.length >= MAX_CUSTOM_STYLES) return `You can have at most ${MAX_CUSTOM_STYLES} custom styles.`
  return null
}
