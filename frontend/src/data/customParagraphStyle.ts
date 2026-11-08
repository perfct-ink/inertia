import { PARAGRAPH_STYLES } from './paragraphStyle'

// Custom paragraph styles: a person's own named styles. A style is a built-in
// paragraph style (its `base`) with a small set of formatting properties laid
// on top. The styles are saved per user (api/paragraphStyles.ts); the allowed
// values are mirrored in backend/app/models/paragraph_style.rb. KEEP IN SYNC.
//
// A paragraph in a document that uses one stores only a reference, its `style`
// attribute "custom-<id>". What it looks like comes from the style, which every
// browser that has the document fetches (api/paragraphStyles.ts), so editing a
// style restyles every paragraph that uses it. The look is drawn by a decoration
// (extensions/CustomParagraphStyle.ts) from the sanitized definition, and a
// paragraph whose style can't be read (it is deleted, or not loaded yet) is
// drawn plain. See docs/features/paragraph_styles.md.

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

// Inline CSS declarations for a style's properties (the base's own look comes
// from the stylesheet, through data-style-base).
export function propertiesCss(properties: StyleProperties): string {
  const declarations: string[] = []
  if (properties.font) declarations.push(`font-family: ${FONT_STACKS[properties.font]}`)
  if (properties.size) declarations.push(`font-size: ${properties.size}px`)
  if (properties.weight) declarations.push(`font-weight: ${properties.weight}`)
  if (properties.color) declarations.push(`color: ${properties.color}`)
  if (properties.spacing) declarations.push(`line-height: ${properties.spacing}`)
  if (properties.align) declarations.push(`text-align: ${properties.align}`)
  return declarations.join('; ')
}

// The HTML attributes that draw a paragraph in this style: the base style's
// look (data-style-base, which ProseMirror.scss styles) and the style's own
// formatting as inline CSS. The definition comes from the server and may be
// someone else's, so it goes through sanitizeProperties and a known base:
// nothing else reaches the page.
export function styleDecoration(style: Pick<CustomParagraphStyle, 'base' | 'properties'>): Record<string, string> {
  const css = propertiesCss(sanitizeProperties(style.properties))
  return {
    ...(isStyleBase(style.base) && style.base !== 'body' && { 'data-style-base': style.base }),
    ...(css && { style: css }),
  }
}

// The ids of the custom styles a document's paragraphs refer to, lowest first,
// from its editor JSON (or any node of it).
export function customStyleIdsIn(node: unknown): number[] {
  const ids = new Set<number>()
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return
    const { type, attrs, content } = value as { type?: unknown; attrs?: { style?: unknown }; content?: unknown }
    if (type === 'paragraph') {
      const id = customStyleIdOfKey(attrs?.style)
      if (id !== null) ids.add(id)
    }
    if (Array.isArray(content)) content.forEach(visit)
  }
  visit(node)
  return [...ids].sort((a, b) => a - b)
}

// The ids of `used` that none of `known` defines: styles the server hasn't
// shown us (yet, or at all).
export function missingStyleIds(used: number[], known: Pick<CustomParagraphStyle, 'id'>[]): number[] {
  const have = new Set(known.map((style) => style.id))
  return used.filter((id) => !have.has(id))
}

// Every style by id, the later list winning (the person's own styles are fresher than a copy looked up with a document).
export function mergeStyles(...lists: CustomParagraphStyle[][]): CustomParagraphStyle[] {
  const byId = new Map<number, CustomParagraphStyle>()
  lists.forEach((list) => list.forEach((style) => byId.set(style.id, style)))
  return [...byId.values()].sort((a, b) => a.id - b.id)
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
