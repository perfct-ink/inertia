import {
  customStyleIdOfKey, customStyleIdsIn, customStyleKey, mergeStyles, missingStyleIds, propertiesCss, sanitizeProperties,
  styleDecoration, validateStyleName, withProperty, MAX_CUSTOM_STYLES,
} from './customParagraphStyle'
import type { CustomParagraphStyle } from './customParagraphStyle'

const callout: CustomParagraphStyle = {
  id: 7, name: 'Callout', base: 'quote', properties: { size: 20, color: '#2563eb', weight: 700, align: 'center' },
}

test('a style is referred to by "custom-" and its id', () => {
  expect(customStyleKey(7)).toBe('custom-7')
  expect(customStyleIdOfKey('custom-7')).toBe(7)
  expect(customStyleIdOfKey('quote')).toBeNull()
  expect(customStyleIdOfKey('custom-')).toBeNull()
  expect(customStyleIdOfKey('custom-7x')).toBeNull()
  expect(customStyleIdOfKey(null)).toBeNull()
  expect(customStyleIdOfKey(7)).toBeNull()
})

test('properties keep only allowed values', () => {
  expect(sanitizeProperties({ size: 20, color: '#2563eb', weight: 700, font: 'serif', spacing: 1.5, align: 'right' }))
    .toEqual({ size: 20, color: '#2563eb', weight: 700, font: 'serif', spacing: 1.5, align: 'right' })
  expect(sanitizeProperties({ size: 7 })).toEqual({})
  expect(sanitizeProperties({ size: 97 })).toEqual({})
  expect(sanitizeProperties({ size: 12.5 })).toEqual({})
  expect(sanitizeProperties({ size: '12' })).toEqual({})
  expect(sanitizeProperties({ weight: 800 })).toEqual({})
  expect(sanitizeProperties({ font: 'comic' })).toEqual({})
  expect(sanitizeProperties({ color: 'red' })).toEqual({})
  expect(sanitizeProperties({ color: 'url(javascript:alert(1))' })).toEqual({})
  expect(sanitizeProperties({ spacing: 0.5 })).toEqual({})
  expect(sanitizeProperties({ spacing: 4 })).toEqual({})
  expect(sanitizeProperties({ align: 'start' })).toEqual({})
  expect(sanitizeProperties({ shadow: '1px 1px red', size: 16 })).toEqual({ size: 16 })
  expect(sanitizeProperties(null)).toEqual({})
  expect(sanitizeProperties('bold')).toEqual({})
})

test('the formatting becomes inline CSS declarations', () => {
  expect(propertiesCss({})).toBe('')
  expect(propertiesCss({ size: 20, color: '#2563eb', weight: 700, spacing: 1.5, align: 'center' }))
    .toBe('font-size: 20px; font-weight: 700; color: #2563eb; line-height: 1.5; text-align: center')
  expect(propertiesCss({ font: 'mono' })).toBe('font-family: ui-monospace, SFMono-Regular, Menlo, monospace')
})

test('a paragraph in a style is drawn from the base style\'s look and the style\'s own formatting', () => {
  expect(styleDecoration(callout)).toEqual({ 'data-style-base': 'quote', style: 'font-size: 20px; font-weight: 700; color: #2563eb; text-align: center' })
  expect(styleDecoration({ base: 'body', properties: { align: 'right' } })).toEqual({ style: 'text-align: right' })
  expect(styleDecoration({ base: 'caption', properties: {} })).toEqual({ 'data-style-base': 'caption' })
  expect(styleDecoration({ base: 'body', properties: {} })).toEqual({})
})

test('unsafe values in a definition never reach the page', () => {
  const unsafe = { base: 'x"><script>', properties: { color: 'red; background: url(x)', size: '20px; position: fixed' } } as never
  expect(styleDecoration(unsafe)).toEqual({})
  expect(styleDecoration({ base: 'quote', properties: { color: 'red', size: 20, shadow: '1px 1px red' } as never })).toEqual({ 'data-style-base': 'quote', style: 'font-size: 20px' })
})

test('a document is searched for the custom styles its paragraphs refer to', () => {
  const doc = {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
      { type: 'paragraph', attrs: { style: 'custom-9' } },
      { type: 'paragraph', attrs: { style: 'quote' } },
      { type: 'paragraph' },
      { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', attrs: { style: 'custom-3' } }] }] },
      { type: 'paragraph', attrs: { style: 'custom-9' } },
      { type: 'heading', attrs: { style: 'custom-4' } },
      { type: 'paragraph', attrs: { style: 'custom-x' } },
    ],
  }
  expect(customStyleIdsIn(doc)).toEqual([3, 9])
  expect(customStyleIdsIn(null)).toEqual([])
  expect(customStyleIdsIn({ type: 'doc' })).toEqual([])
  expect(customStyleIdsIn('custom-3')).toEqual([])
})

test('styles still to be fetched are the used ones nobody has defined', () => {
  expect(missingStyleIds([3, 9, 12], [{ id: 9 }, { id: 4 }])).toEqual([3, 12])
  expect(missingStyleIds([], [{ id: 9 }])).toEqual([])
  expect(missingStyleIds([3], [])).toEqual([3])
})

test('merged lists have each style once, by id, with the later list winning', () => {
  const mine = [{ ...callout, name: 'Mine' }]
  const looked = [callout, { ...callout, id: 9, name: 'Theirs' }]
  expect(mergeStyles(looked, mine).map((s) => [s.id, s.name])).toEqual([[7, 'Mine'], [9, 'Theirs']])
  expect(mergeStyles()).toEqual([])
})

test('withProperty sets or clears one property without changing the original', () => {
  const original = { size: 20 }
  expect(withProperty(original, 'color', '#2563eb')).toEqual({ size: 20, color: '#2563eb' })
  expect(withProperty(original, 'size', undefined)).toEqual({})
  expect(original).toEqual({ size: 20 })
})

test('a name must be given, short, not a built-in label and not already used', () => {
  const existing = [{ name: 'Callout' }]
  expect(validateStyleName('  ', existing)).toBe('Give the style a name.')
  expect(validateStyleName('x'.repeat(41), existing)).toBe('Use 40 characters or fewer.')
  expect(validateStyleName('quote', existing)).toBe('quote is already the name of a built-in style.')
  expect(validateStyleName('heading  1', existing)).toBe('heading 1 is already the name of a built-in style.')
  expect(validateStyleName('Heading 1', existing)).toBe('Heading 1 is already the name of a built-in style.')
  expect(validateStyleName(' callout ', existing)).toBe('You already have a style called callout.')
  expect(validateStyleName('Warning', existing)).toBeNull()
  const full = Array.from({ length: MAX_CUSTOM_STYLES }, (_, i) => ({ name: `Style ${i}` }))
  expect(validateStyleName('One more', full)).toBe('You can have at most 50 custom styles.')
})
