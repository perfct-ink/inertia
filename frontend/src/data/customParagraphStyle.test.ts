import {
  customStyleAttributes, customStyleHtmlAttributes, customStyleIdOfKey, customStyleKey, parseSnapshot, sanitizeProperties,
  sanitizeSnapshot, snapshotCss, snapshotOf, snapshotOfBlock, validateStyleName, withProperty, MAX_CUSTOM_STYLES,
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

test('a snapshot has a known base and only allowed properties', () => {
  expect(sanitizeSnapshot({ base: 'quote', size: 20 })).toEqual({ base: 'quote', size: 20 })
  expect(sanitizeSnapshot({ size: 20 })).toEqual({ base: 'body', size: 20 })
  expect(sanitizeSnapshot({ base: 'heading1', color: 'nope' })).toEqual({ base: 'body' })
  expect(sanitizeSnapshot(null)).toBeNull()
  expect(sanitizeSnapshot('quote')).toBeNull()
  expect(sanitizeSnapshot([1, 2])).toBeNull()
})

test('applying a style sets its reference and a flat copy of the resolved formatting', () => {
  expect(customStyleAttributes(callout)).toEqual({
    style: 'custom-7',
    styleProps: { base: 'quote', size: 20, color: '#2563eb', weight: 700, align: 'center' },
  })
  expect(snapshotOf({ base: 'body', properties: {} })).toEqual({ base: 'body' })
})

test('a block has a snapshot only when its style is a custom one', () => {
  const styleProps = { base: 'quote', size: 20 }
  expect(snapshotOfBlock({ style: 'custom-7', styleProps })).toEqual({ base: 'quote', size: 20 })
  expect(snapshotOfBlock({ style: 'quote', styleProps })).toBeNull()
  expect(snapshotOfBlock({ style: 'body', styleProps })).toBeNull()
  expect(snapshotOfBlock({ style: 'custom-7', styleProps: null })).toBeNull()
  expect(snapshotOfBlock({})).toBeNull()
})

test('the formatting becomes inline CSS declarations', () => {
  expect(snapshotCss({})).toBe('')
  expect(snapshotCss({ size: 20, color: '#2563eb', weight: 700, spacing: 1.5, align: 'center' }))
    .toBe('font-size: 20px; font-weight: 700; color: #2563eb; line-height: 1.5; text-align: center')
  expect(snapshotCss({ font: 'mono' })).toBe('font-family: ui-monospace, SFMono-Regular, Menlo, monospace')
})

test('a custom-styled paragraph is drawn from its sanitized copy; any other paragraph gets nothing', () => {
  const attrs = customStyleHtmlAttributes('custom-7', { base: 'quote', size: 20, color: '#2563eb' })
  expect(attrs['data-style-base']).toBe('quote')
  expect(attrs.style).toBe('font-size: 20px; color: #2563eb')
  expect(JSON.parse(attrs['data-style-props'])).toEqual({ base: 'quote', size: 20, color: '#2563eb' })

  expect(customStyleHtmlAttributes('custom-7', { base: 'body', align: 'right' })).toEqual({
    'data-style-props': '{"base":"body","align":"right"}', style: 'text-align: right',
  })
  expect(customStyleHtmlAttributes('custom-7', { base: 'caption' })).toEqual({
    'data-style-props': '{"base":"caption"}', 'data-style-base': 'caption',
  })
  expect(customStyleHtmlAttributes('quote', { base: 'quote', size: 20 })).toEqual({})
  expect(customStyleHtmlAttributes('custom-7', null)).toEqual({})
})

test('unsafe values in a document never reach the page', () => {
  const attrs = customStyleHtmlAttributes('custom-7', { base: 'x"><script>', color: 'red; background: url(x)', size: '20px; position: fixed' })
  expect(attrs).toEqual({ 'data-style-props': '{"base":"body"}' })
})

test('a snapshot is read back from its attribute, or null when it is missing or broken', () => {
  expect(parseSnapshot('{"base":"quote","size":20}')).toEqual({ base: 'quote', size: 20 })
  expect(parseSnapshot('{"base":"quote","size":99999}')).toEqual({ base: 'quote' })
  expect(parseSnapshot('not json')).toBeNull()
  expect(parseSnapshot('')).toBeNull()
  expect(parseSnapshot(null)).toBeNull()
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
