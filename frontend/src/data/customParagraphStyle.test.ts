import {
  BODY_ATTRS, customStyleIdOfKey, customStyleKey, propertiesCss, readSnapshot, refreshedAttrs, sanitizeProperties,
  snapshotAttrs, startingFormat, styleDecoration, validateStyleName, withProperty, MAX_CUSTOM_STYLES,
} from './customParagraphStyle'
import type { CustomParagraphStyle } from './customParagraphStyle'

const callout: CustomParagraphStyle = {
  id: 7, name: 'Callout', base: 'quote', properties: { size: 20, color: '#2563eb', weight: 700, align: 'center' },
}
const OWNER = 3

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

test('applying a style puts its id, name and resolved formatting on the paragraph', () => {
  const attrs = snapshotAttrs(callout, OWNER)
  expect(attrs.style).toBe('custom-7')
  expect(attrs.styleName).toBe('Callout')
  expect(JSON.parse(attrs.styleProps as string)).toEqual({ owner: 3, base: 'quote', properties: { size: 20, color: '#2563eb', weight: 700, align: 'center' } })
})

test('the copy keeps only checked values, even from a style that holds more', () => {
  const attrs = snapshotAttrs({ ...callout, base: 'x' as never, properties: { size: 20, shadow: '1px' } as never }, null)
  expect(JSON.parse(attrs.styleProps as string)).toEqual({ owner: null, base: 'body', properties: { size: 20 } })
})

test('a paragraph\'s copy reads back as it was written', () => {
  expect(readSnapshot(snapshotAttrs(callout, OWNER))).toEqual({ name: 'Callout', ownerId: 3, base: 'quote', properties: callout.properties })
})

test('a copy that is missing, not a custom style\'s, too long or not JSON is not read', () => {
  const good = snapshotAttrs(callout, OWNER)
  expect(readSnapshot({ ...good, style: 'quote' })).toBeNull()
  expect(readSnapshot({ ...good, style: 'body' })).toBeNull()
  expect(readSnapshot({ style: 'custom-7' })).toBeNull()
  expect(readSnapshot({ ...good, styleProps: null })).toBeNull()
  expect(readSnapshot({ ...good, styleProps: '{not json' })).toBeNull()
  expect(readSnapshot({ ...good, styleProps: '"text"' })).toBeNull()
  expect(readSnapshot({ ...good, styleProps: 'null' })).toBeNull()
  expect(readSnapshot({ ...good, styleProps: `{"properties":{"color":"${'x'.repeat(700)}"}}` })).toBeNull()
})

test('unsafe or odd values in a copy are dropped when it is read', () => {
  const copy = { style: 'custom-7', styleName: 'x'.repeat(100), styleProps: JSON.stringify({ owner: '3', base: 'x"><script>', properties: { color: 'red; background: url(x)', size: 20 } }) }
  expect(readSnapshot(copy)).toEqual({ name: 'x'.repeat(40), ownerId: null, base: 'body', properties: { size: 20 } })
  expect(readSnapshot({ ...copy, styleName: 5 })?.name).toBe('')
})

test('a paragraph in a style is drawn from the base style\'s look and the style\'s own formatting', () => {
  expect(styleDecoration(snapshotAttrs(callout, OWNER))).toEqual({ 'data-style-base': 'quote', style: 'font-size: 20px; font-weight: 700; color: #2563eb; text-align: center' })
  expect(styleDecoration(snapshotAttrs({ ...callout, base: 'body', properties: { align: 'right' } }, OWNER))).toEqual({ style: 'text-align: right' })
  expect(styleDecoration(snapshotAttrs({ ...callout, base: 'caption', properties: {} }, OWNER))).toEqual({ 'data-style-base': 'caption' })
  expect(styleDecoration(snapshotAttrs({ ...callout, base: 'body', properties: {} }, OWNER))).toEqual({})
})

test('only a paragraph whose style is a custom one is drawn from a copy', () => {
  const stale = { ...snapshotAttrs(callout, OWNER), style: 'quote' }
  expect(styleDecoration(stale)).toEqual({})
  expect(styleDecoration({ style: 'body' })).toEqual({})
  expect(styleDecoration({ style: 'custom-7' })).toEqual({})
})

test('unsafe values in a copy never reach the page', () => {
  const props = JSON.stringify({ owner: 1, base: 'quote', properties: { color: 'red', size: 20, shadow: '1px 1px red' } })
  expect(styleDecoration({ style: 'custom-7', styleName: 'x', styleProps: props })).toEqual({ 'data-style-base': 'quote', style: 'font-size: 20px' })
  const unsafe = JSON.stringify({ base: 'x"><script>', properties: { color: 'red; background: url(x)', size: '20px; position: fixed' } })
  expect(styleDecoration({ style: 'custom-7', styleName: 'x', styleProps: unsafe })).toEqual({})
})

describe('keeping the copies in a document up to date for the style\'s owner', () => {
  const applied = snapshotAttrs(callout, OWNER)

  test('a copy that matches the style needs no change', () => {
    expect(refreshedAttrs(applied, [callout], OWNER)).toBeNull()
  })

  test('an edited style replaces the copy, name and formatting', () => {
    const edited = { ...callout, name: 'Big callout', properties: { size: 28 } }
    const next = refreshedAttrs(applied, [edited], OWNER)
    expect(next).toEqual(snapshotAttrs(edited, OWNER))
    expect(refreshedAttrs(next as never, [edited], OWNER)).toBeNull()
  })

  test('a change of the base alone also refreshes the copy', () => {
    expect(refreshedAttrs(applied, [{ ...callout, base: 'caption' }], OWNER)).toEqual(snapshotAttrs({ ...callout, base: 'caption' }, OWNER))
  })

  test('a copy written by another client in another key order is not seen as a change', () => {
    const reordered = { ...applied, styleProps: JSON.stringify({ properties: { align: 'center', weight: 700, color: '#2563eb', size: 20 }, base: 'quote', owner: OWNER }) }
    expect(refreshedAttrs(reordered, [callout], OWNER)).toBeNull()
  })

  test('a missing or unreadable copy of a style the person has is rewritten', () => {
    expect(refreshedAttrs({ style: 'custom-7' }, [callout], OWNER)).toEqual(applied)
    expect(refreshedAttrs({ ...applied, styleProps: '{oops' }, [callout], OWNER)).toEqual(applied)
  })

  test('a style the person deleted turns their paragraphs into Body', () => {
    expect(refreshedAttrs(applied, [], OWNER)).toEqual(BODY_ATTRS)
    expect(refreshedAttrs(applied, [{ ...callout, id: 8 }], OWNER)).toEqual(BODY_ATTRS)
  })

  test('someone else\'s style, or a copy that does not name an owner, is left alone', () => {
    expect(refreshedAttrs(snapshotAttrs(callout, 99), [], OWNER)).toBeNull()
    expect(refreshedAttrs(snapshotAttrs(callout, null), [], OWNER)).toBeNull()
    expect(refreshedAttrs({ style: 'custom-7' }, [], OWNER)).toBeNull()
    expect(refreshedAttrs({ ...applied, styleProps: '{oops' }, [], OWNER)).toBeNull()
  })

  test('paragraphs in a built-in style or none are left alone', () => {
    expect(refreshedAttrs({ style: 'quote' }, [callout], OWNER)).toBeNull()
    expect(refreshedAttrs({ style: 'body' }, [], OWNER)).toBeNull()
    expect(refreshedAttrs({}, [], OWNER)).toBeNull()
  })
})

describe('what a new style starts from', () => {
  test('a paragraph in a custom style starts from that style\'s copy', () => {
    expect(startingFormat(snapshotAttrs(callout, OWNER), 'body')).toEqual({ base: 'quote', properties: callout.properties })
  })

  test('a paragraph in a built-in style starts from it; anything else from Body', () => {
    expect(startingFormat({ style: 'caption' }, 'caption')).toEqual({ base: 'caption', properties: {} })
    expect(startingFormat({}, 'heading2')).toEqual({ base: 'body', properties: {} })
    expect(startingFormat({}, null)).toEqual({ base: 'body', properties: {} })
  })
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
