import { readFileSync } from 'fs'
import { join } from 'path'
import {
  allEditorKeys,
  documentShortcutRows,
  duplicateKeys,
  EDITOR_SHORTCUTS,
  INHERITED_SHORTCUTS,
  NOT_BOUND_NOTES_KEYS,
  REPLACED_DEFAULTS,
  replacedKeys,
  RESERVED_KEYS,
  titleWithShortcut,
} from './editorShortcut'

// A file in the repository, from the frontend's Jest run or the offline runner.
function repoFile(path: string): string {
  const root = typeof __dirname === 'string' ? join(__dirname, '../../..') : (process.env.INERTIA_ROOT as string)
  return readFileSync(join(root, path), 'utf8')
}

const keysOf = (action: string) => EDITOR_SHORTCUTS.find((s) => s.action === action)?.keys

test('the table has the Apple Notes keys, and Google Docs keys where Notes has none', () => {
  expect(keysOf('strike')).toBe('⌘⇧X')
  expect(keysOf('bulletList')).toBe('⌘⇧7')
  expect(keysOf('orderedList')).toBe('⌘⇧9')
  expect(keysOf('taskList')).toBe('⌘⇧L')
  expect(keysOf('taskDone')).toBe('⌘⇧U')
  expect(keysOf('indent')).toBe('⌘]')
  expect(keysOf('outdent')).toBe('⌘[')
  expect(keysOf('moveUp')).toBe('⌃⌘↑')
  expect(keysOf('moveDown')).toBe('⌃⌘↓')
  expect(keysOf('clearFormatting')).toBe('⌘\\')
})

test('every action appears once and no keystroke is bound twice', () => {
  expect(new Set(EDITOR_SHORTCUTS.map((s) => s.action)).size).toBe(EDITOR_SHORTCUTS.length)
  expect(duplicateKeys()).toEqual([])
})

test('duplicateKeys reports a repeated key', () => {
  expect(duplicateKeys(['Mod-a', 'Mod-b', 'Mod-a'])).toEqual(['Mod-a'])
})

test('the code block does not take Monospace\'s ⌘⇧M', () => {
  expect(keysOf('codeBlock')).toBe('⌘⌥⇧C')
  expect(RESERVED_KEYS.find((r) => r.for === 'Monospace style')?.keys).toBe('⌘⇧M')
  expect(EDITOR_SHORTCUTS.map((s) => s.tiptap)).not.toContain('Mod-Shift-m')
})

test('the keys other tasks bind are left free', () => {
  const bound = EDITOR_SHORTCUTS.map((s) => s.tiptap)
  for (const reserved of RESERVED_KEYS) expect(bound).not.toContain(reserved.tiptap)
  expect(RESERVED_KEYS.map((r) => r.tiptap)).toEqual(expect.arrayContaining(['Mod-Shift-8', 'Mod-k', 'Mod-Alt-t']))
})

test('the Apple Notes heading keys left out are not bound', () => {
  const bound = allEditorKeys()
  for (const left of NOT_BOUND_NOTES_KEYS) expect(bound).not.toContain(left)
})

test('the table keys avoid every key the global shortcut handler matches', () => {
  // The handler ignores Shift (and Alt, outside a browser), so ⌘⇧T still starts a task.
  const sidebar = repoFile('frontend/src/components/file-manager/Sidebar.tsx')
  const global = new Set([...sidebar.matchAll(/isShortcut\(e, '(.+?)'\)/g), ...sidebar.matchAll(/shortcutKey\(e\) === '(.+?)'/g)].map((m) => m[1]))
  expect([...global]).toEqual(expect.arrayContaining(['/', 'e', 'j', 'k', 'n', 't', 'w']))
  const lastKey = (tiptap: string) => tiptap.slice(tiptap.lastIndexOf('-') + 1).toLowerCase()
  EDITOR_SHORTCUTS.forEach((s) => expect(global.has(lastKey(s.tiptap))).toBe(false))
})

test('the defaults being replaced belong to the four extensions the editor wraps', () => {
  expect([...new Set(REPLACED_DEFAULTS.map(([name]) => name))].sort()).toEqual(['bulletList', 'codeBlock', 'orderedList', 'strike'])
  expect(replacedKeys('orderedList')).toEqual(['Mod-Shift-7'])
  expect(replacedKeys('code')).toEqual([])
})

test('a replaced default is bound again only when it moved to another action', () => {
  const bound = EDITOR_SHORTCUTS.map((s) => s.tiptap)
  // TipTap's numbered list was ⌘⇧7, now the bulleted list's key: that is the point of dropping the default.
  expect(REPLACED_DEFAULTS.filter(([, key]) => bound.includes(key))).toEqual([['orderedList', 'Mod-Shift-7']])
})

test('the cheat sheet rows are the table and then the keys that already matched', () => {
  const rows = documentShortcutRows()
  expect(rows).toHaveLength(EDITOR_SHORTCUTS.length + INHERITED_SHORTCUTS.length)
  expect(rows[0]).toEqual({ label: 'Strikethrough', keys: '⌘⇧X' })
  expect(rows[EDITOR_SHORTCUTS.length]).toEqual({ label: 'Bold', keys: '⌘B' })
  expect(new Set(rows.map((r) => r.label)).size).toBe(rows.length)
})

test('a tooltip shows the key of its action', () => {
  expect(titleWithShortcut('Strikethrough', 'strike')).toBe('Strikethrough (⌘⇧X)')
  expect(titleWithShortcut('Nothing', 'strike', [])).toBe('Nothing')
})

test('docs/keyboard-shortcuts.md lists every editor shortcut with its keys', () => {
  const doc = repoFile('docs/keyboard-shortcuts.md')
  for (const { label, keys } of documentShortcutRows()) {
    expect(doc).toContain(label)
    expect(doc).toContain(keys)
  }
  for (const reserved of RESERVED_KEYS) expect(doc).toContain(reserved.keys)
})
