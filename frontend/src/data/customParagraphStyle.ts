import { PARAGRAPH_STYLES } from './paragraphStyle'

// Custom paragraph styles: a person's own named styles. A style is a built-in
// paragraph style (its `base`) with a small set of formatting properties laid
// on top. The styles are saved per user (api/paragraphStyles.ts); the allowed
// values are mirrored in backend/app/models/paragraph_style.rb. KEEP IN SYNC.
//
// A paragraph in a document that uses one stores three attributes (mirrored in
// extensions/StyledParagraph.ts and collab-server/src/schema.ts):
//   style      "custom-<id>", which style it is
//   styleName  the style's name when it was last applied or refreshed
//   styleProps a JSON string, {owner, base, properties}: the style's formatting
//              resolved at that time
// The paragraph is drawn from that copy alone, so it looks the same to everyone
// who opens the document, whoever they are and whatever styles they have. Only
// the style's owner keeps it fresh: when they edit or delete the style, the
// editor they have a document open in brings the copies in it up to date
// (refreshedAttrs, hooks/useCustomStyleSync.ts); everyone else sees the last
// copy. See docs/features/paragraph_styles.md.

export const CUSTOM_STYLE_PREFIX = 'custom-'
export const STYLE_NAME_MAX = 40
export const MAX_CUSTOM_STYLES = 50
// The copy of a style's formatting comes from a document anyone can edit, so a
// longer string than a style can produce is not read at all.
const STYLE_PROPS_MAX_LENGTH = 600

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

// ---- The copy of a style that a paragraph carries ----

// The paragraph attributes that hold a custom style.
export interface StyleAttrs {
  style: string
  styleName: string | null
  styleProps: string | null
}

// A paragraph with no custom style and no built-in one either: a plain Body.
export const BODY_ATTRS: StyleAttrs = { style: 'body', styleName: null, styleProps: null }
// What a built-in style puts in place of a custom style's copy.
export const NO_CUSTOM_COPY = { styleName: null, styleProps: null }

// What a paragraph's copy of a style says, read back and checked.
export interface StyleSnapshot {
  name: string
  // The user who owns the style, or null when the copy doesn't say.
  ownerId: number | null
  base: StyleBase
  properties: StyleProperties
}

// The attributes that put `style` (owned by `ownerId`) on a paragraph.
export function snapshotAttrs(style: Pick<CustomParagraphStyle, 'id' | 'name' | 'base' | 'properties'>, ownerId: number | null): StyleAttrs {
  const base = isStyleBase(style.base) ? style.base : 'body'
  return {
    style: customStyleKey(style.id),
    styleName: style.name,
    styleProps: JSON.stringify({ owner: ownerId, base, properties: sanitizeProperties(style.properties) }),
  }
}

// The copy of a custom style a paragraph carries, or null when its `style` isn't
// a custom one or the copy can't be read. It may come from another person's
// browser, so every value is checked and anything unexpected is dropped.
export function readSnapshot(attrs: { style?: unknown; styleName?: unknown; styleProps?: unknown }): StyleSnapshot | null {
  if (customStyleIdOfKey(attrs.style) === null) return null
  const raw = attrs.styleProps
  if (typeof raw !== 'string' || raw.length > STYLE_PROPS_MAX_LENGTH) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null
  const { owner, base, properties } = parsed as Record<string, unknown>
  return {
    name: typeof attrs.styleName === 'string' ? attrs.styleName.slice(0, STYLE_NAME_MAX) : '',
    ownerId: typeof owner === 'number' && Number.isInteger(owner) ? owner : null,
    base: isStyleBase(base) ? base : 'body',
    properties: sanitizeProperties(properties),
  }
}

function sameSnapshot(a: StyleSnapshot | null, b: StyleSnapshot | null): boolean {
  if (!a || !b) return a === b
  return a.name === b.name && a.ownerId === b.ownerId && a.base === b.base && JSON.stringify(a.properties) === JSON.stringify(b.properties)
}

// The HTML attributes that draw a paragraph in its style's copy: the base
// style's look (data-style-base, which ProseMirror.scss styles) and the style's
// own formatting as inline CSS. Nothing but the checked values reaches the page.
export function styleDecoration(attrs: { style?: unknown; styleName?: unknown; styleProps?: unknown }): Record<string, string> {
  const snapshot = readSnapshot(attrs)
  if (!snapshot) return {}
  const css = propertiesCss(snapshot.properties)
  return {
    ...(snapshot.base !== 'body' && { 'data-style-base': snapshot.base }),
    ...(css && { style: css }),
  }
}

// What a paragraph's attributes should become so the copy of its style is
// current for `userId`, or null when they are already right (or aren't this
// user's to change). `styles` must be the user's full, fresh list:
//   - the style is in the list: its copy is replaced if it differs;
//   - it isn't, and the copy says this user owned it: it was deleted, so the
//     paragraph becomes Body;
//   - otherwise it is someone else's style (or an unreadable copy of one) and is left alone.
export function refreshedAttrs(
  attrs: { style?: unknown; styleName?: unknown; styleProps?: unknown },
  styles: CustomParagraphStyle[],
  userId: number,
): StyleAttrs | null {
  const id = customStyleIdOfKey(attrs.style)
  if (id === null) return null
  const current = styles.find((style) => style.id === id)
  const snapshot = readSnapshot(attrs)
  if (current) {
    const next = snapshotAttrs(current, userId)
    return sameSnapshot(snapshot, readSnapshot(next)) ? null : next
  }
  return snapshot?.ownerId === userId ? BODY_ATTRS : null
}

// What a new style starts from: the formatting of the paragraph the cursor is
// in. A paragraph in a custom style starts from that style's copy, any other
// from the built-in style it has (a heading starts from Body).
export function startingFormat(
  attrs: { style?: unknown; styleName?: unknown; styleProps?: unknown },
  builtIn: string | null,
): { base: StyleBase; properties: StyleProperties } {
  const snapshot = readSnapshot(attrs)
  if (snapshot) return { base: snapshot.base, properties: snapshot.properties }
  return { base: isStyleBase(builtIn) ? builtIn : 'body', properties: {} }
}

// A copy of `properties` with `key` set, or removed when `value` is undefined.
export function withProperty<K extends keyof StyleProperties>(properties: StyleProperties, key: K, value: StyleProperties[K] | undefined): StyleProperties {
  const next: StyleProperties = { ...properties }
  if (value === undefined) delete next[key]
  else next[key] = value
  return next
}

// Why a style can't be saved under `name`, or null when it can. `existing` is
// the person's other custom styles (without the one being edited).
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
