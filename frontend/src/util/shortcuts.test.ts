import { editorKeepsKey, inDocumentEditor, isShortcut, matchesChord, shortcutAvailable, shortcutKey, shortcutLabel } from './shortcuts'

const press = (code: string, mods: { meta?: boolean; alt?: boolean; key?: string } = {}) =>
  ({ code, key: mods.key ?? code.replace('Key', '').toLowerCase(), metaKey: mods.meta ?? true, ctrlKey: false, altKey: mods.alt ?? false })

test('reads the physical key, so ⌥N and ⇧/ still count as N and /', () => {
  expect(shortcutKey({ code: 'KeyN', key: '˜' })).toBe('n')
  expect(shortcutKey({ code: 'Slash', key: '?' })).toBe('/')
})

test('in a browser, the shortcuts it keeps for itself need ⌥; others do not', () => {
  expect(isShortcut(press('KeyN'), 'n', false)).toBe(false)
  expect(isShortcut(press('KeyN', { alt: true, key: '˜' }), 'n', false)).toBe(true)
  expect(isShortcut(press('KeyT', { alt: true }), 't', false)).toBe(true)
  expect(isShortcut(press('KeyK'), 'k', false)).toBe(true)
  expect(isShortcut(press('KeyK', { meta: false }), 'k', false)).toBe(false)
})

test('the Electron app and Mac shell get the plain ⌘ shortcuts', () => {
  expect(isShortcut(press('KeyN'), 'n', true)).toBe(true)
  expect(shortcutLabel('⌘N', true)).toBe('⌘N')
})

test('⌘W only works where the app gets it, never with ⌥ in a browser', () => {
  expect(shortcutAvailable('⌘W', false)).toBe(false)
  expect(shortcutAvailable('⌘W', true)).toBe(true)
  expect(shortcutLabel('⌘W', true)).toBe('⌘W')
})

test('labels show ⌥ where a browser needs it', () => {
  expect(shortcutLabel('⌘N', false)).toBe('⌥⌘N')
  expect(shortcutLabel('⌘⇧N', false)).toBe('⌥⌘⇧N')
  expect(shortcutLabel('⌘K', false)).toBe('⌘K')
})

const chord = (code: string, mods: { meta?: boolean; ctrl?: boolean; alt?: boolean; shift?: boolean; target?: EventTarget | null } = {}) =>
  ({ code, key: code.replace('Key', '').toLowerCase(), metaKey: mods.meta ?? false, ctrlKey: mods.ctrl ?? false, altKey: mods.alt ?? false, shiftKey: mods.shift ?? false, target: mods.target ?? null })

test('matchesChord reads a TipTap key name: Mod is ⌘ or Ctrl, Shift and Alt must match exactly', () => {
  expect(matchesChord(chord('KeyK', { meta: true }), 'Mod-k')).toBe(true)
  expect(matchesChord(chord('KeyK', { ctrl: true }), 'Mod-k')).toBe(true)
  expect(matchesChord(chord('KeyK'), 'Mod-k')).toBe(false)
  expect(matchesChord(chord('KeyK', { meta: true, shift: true }), 'Mod-k')).toBe(false)
  expect(matchesChord(chord('KeyT', { meta: true, alt: true }), 'Mod-Alt-t')).toBe(true)
  expect(matchesChord(chord('KeyT', { meta: true }), 'Mod-Alt-t')).toBe(false)
  expect(matchesChord(chord('KeyX', { meta: true, shift: true }), 'Mod-Shift-x')).toBe(true)
})

test('only a keystroke inside the document editor counts as being in it', () => {
  const editor = document.createElement('div')
  editor.className = 'ProseMirror'
  const line = document.createElement('p')
  editor.appendChild(line)
  const input = document.createElement('input')
  expect(inDocumentEditor({ target: line })).toBe(true)
  expect(inDocumentEditor({ target: editor })).toBe(true)
  expect(inDocumentEditor({ target: input })).toBe(false)
  expect(inDocumentEditor({ target: window })).toBe(false)
  expect(inDocumentEditor({ target: null })).toBe(false)
})

test('in the document editor, ⌘K, ⌘E and ⌥⌘T are the editor\'s; elsewhere they stay global', () => {
  const editor = document.createElement('div')
  editor.className = 'ProseMirror'
  const line = document.createElement('p')
  editor.appendChild(line)
  const outside = document.createElement('input')

  expect(editorKeepsKey(chord('KeyK', { meta: true, target: line }))).toBe(true)
  expect(editorKeepsKey(chord('KeyE', { ctrl: true, target: line }))).toBe(true)
  expect(editorKeepsKey(chord('KeyT', { meta: true, alt: true, target: line }))).toBe(true)

  expect(editorKeepsKey(chord('KeyK', { meta: true, target: outside }))).toBe(false)
  expect(editorKeepsKey(chord('KeyE', { meta: true, target: window }))).toBe(false)
  // Chords the editor does not bind stay global even in the document: new document, new idea, ⌘T.
  expect(editorKeepsKey(chord('KeyN', { meta: true, target: line }))).toBe(false)
  expect(editorKeepsKey(chord('KeyJ', { meta: true, target: line }))).toBe(false)
  expect(editorKeepsKey(chord('KeyT', { meta: true, target: line }))).toBe(false)
})
