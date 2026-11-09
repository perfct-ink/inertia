import { applyParagraphStyle, paragraphStyleKeymap } from './paragraphStyleCommand'

// A chain that records the commands it is given; `result` is what run() says.
function fakeEditor(result = true) {
  const calls: string[] = []
  const chain: Record<string, (...args: unknown[]) => unknown> = {
    focus: () => chain,
    setHeading: (arg) => { calls.push(`heading:${(arg as { level: number }).level}`); return chain },
    setParagraph: () => { calls.push('paragraph'); return chain },
    updateAttributes: (type, attrs) => { calls.push(`${type}:${(attrs as { style: string }).style}`); return chain },
    run: () => result,
  }
  return { editor: { chain: () => chain } as unknown as Parameters<typeof applyParagraphStyle>[0], calls }
}

test('a heading style sets the heading level', () => {
  const { editor, calls } = fakeEditor()
  expect(applyParagraphStyle(editor, 'heading2')).toBe(true)
  expect(calls).toEqual(['heading:2'])
})

test('a named style sets a plain paragraph, then its style', () => {
  const { editor, calls } = fakeEditor()
  expect(applyParagraphStyle(editor, 'quote')).toBe(true)
  expect(calls).toEqual(['paragraph', 'paragraph:quote'])
})

test('says so when the block cannot take the style', () => {
  const { editor } = fakeEditor(false)
  expect(applyParagraphStyle(editor, 'title')).toBe(false)
})

test('the keymap binds the keys for Title, Subtitle, Body and Quote, and leaves the headings to TipTap', () => {
  const { editor } = fakeEditor()
  expect(Object.keys(paragraphStyleKeymap(editor)).sort()).toEqual(['Mod-Alt-0', 'Mod-Alt-7', 'Mod-Alt-8', 'Mod-Alt-9'])
})

test('each key applies its own style', () => {
  const { editor, calls } = fakeEditor()
  const keymap = paragraphStyleKeymap(editor)
  keymap['Mod-Alt-7']()
  keymap['Mod-Alt-8']()
  keymap['Mod-Alt-0']()
  keymap['Mod-Alt-9']()
  expect(calls).toEqual(['paragraph', 'paragraph:title', 'paragraph', 'paragraph:subtitle', 'paragraph', 'paragraph:body', 'paragraph', 'paragraph:quote'])
})

test('a key reports whether the style was applied, so an unapplied one falls through', () => {
  const { editor } = fakeEditor(false)
  expect(paragraphStyleKeymap(editor)['Mod-Alt-7']()).toBe(false)
})
