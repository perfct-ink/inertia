import { readFileSync } from 'fs'
import { join } from 'path'
import {
  allEditorKeys,
  boundShortcuts,
  BROWSER_RESERVED_KEYS,
  clashForAction,
  DESKTOP_RESERVED_KEYS,
  documentShortcutRows,
  duplicateKeys,
  EDITOR_COMMAND_EVENT,
  EDITOR_SHORTCUTS,
  formatMenuItems,
  GLOBAL_CLASHES,
  INHERITED_SHORTCUTS,
  keysFor,
  NOT_BOUND_NOTES_KEYS,
  REPLACED_DEFAULTS,
  replacedKeys,
  RESERVED_KEYS,
  tiptapFor,
  titleWithShortcut,
} from './editorShortcut'

// A file in the repository, from the frontend's Jest run or the offline runner.
function repoFile(path: string): string {
  const root = typeof __dirname === 'string' ? join(__dirname, '../../..') : (process.env.INERTIA_ROOT as string)
  return readFileSync(join(root, path), 'utf8')
}

const keysOf = (action: string) => EDITOR_SHORTCUTS.find((s) => s.action === action)?.keys
const rowOf = (action: string) => EDITOR_SHORTCUTS.find((s) => s.action === action)

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
  expect(keysOf('link')).toBe('⌘K')
  expect(keysOf('table')).toBe('⌥⌘T')
  expect(keysOf('clearFormatting')).toBe('⌘\\')
})

test('every action appears once and no keystroke is bound twice on either platform', () => {
  expect(new Set(EDITOR_SHORTCUTS.map((s) => s.action)).size).toBe(EDITOR_SHORTCUTS.length)
  expect(duplicateKeys(allEditorKeys(true))).toEqual([])
  expect(duplicateKeys(allEditorKeys(false))).toEqual([])
})

test('duplicateKeys reports a repeated key', () => {
  expect(duplicateKeys(['Mod-a', 'Mod-b', 'Mod-a'])).toEqual(['Mod-a'])
})

test('the code block takes Notes\' ⌘⇧M, the Monospace style\'s key, and the temporary ⌘⌥⇧C is gone', () => {
  // Alex, 2026-11-09: Monospace and the code block are one thing, so one key. This is the one
  // key lifted from the reserved list on purpose.
  expect(keysOf('codeBlock')).toBe('⌘⇧M')
  expect(rowOf('codeBlock')?.tiptap).toBe('Mod-Shift-m')
  expect(RESERVED_KEYS.map((r) => r.tiptap)).not.toContain('Mod-Shift-m')
  expect(allEditorKeys().filter((key) => key === 'Mod-Shift-m')).toHaveLength(1)
  expect(allEditorKeys()).not.toContain('Mod-Alt-Shift-c')
  expect(documentShortcutRows(true).map((r) => r.keys)).not.toContain('⌘⌥⇧C')
  expect(titleWithShortcut('Code block', 'codeBlock', true)).toBe('Code block (⌘⇧M)')
})

test('the paragraph-style keys other tasks bind are left free', () => {
  const bound = EDITOR_SHORTCUTS.map((s) => s.tiptap)
  for (const reserved of RESERVED_KEYS) expect(bound).not.toContain(reserved.tiptap)
  expect(RESERVED_KEYS.map((r) => r.tiptap)).toEqual(['Mod-Alt-7', 'Mod-Alt-8', 'Mod-Alt-9'])
})

test('the dashed list key is in the table and reserved until its block exists', () => {
  const dashed = rowOf('dashedList')
  expect(dashed?.keys).toBe('⌘⇧8')
  expect(dashed?.tiptap).toBe('Mod-Shift-8')
  expect(dashed?.pending).toBe('dashed-list-block')
  expect(boundShortcuts().map((s) => s.action)).not.toContain('dashedList')
  expect(boundShortcuts()).toHaveLength(EDITOR_SHORTCUTS.length - 1)
  // Nothing else takes ⌘⇧8 (TipTap's bullet list default is dropped), and nothing shows it yet.
  expect(allEditorKeys().filter((key) => key === 'Mod-Shift-8')).toHaveLength(1)
  expect(replacedKeys('bulletList')).toContain('Mod-Shift-8')
  expect(documentShortcutRows(true).map((r) => r.keys)).not.toContain('⌘⇧8')
  expect(formatMenuItems().map((i) => i.action)).not.toContain('dashedList')
  expect(titleWithShortcut('Dashed list', 'dashedList', true)).toBe('Dashed list')
  // Only the table row is pending.
  expect(EDITOR_SHORTCUTS.filter((s) => s.pending).map((s) => s.action)).toEqual(['dashedList'])
})

test('the Apple Notes heading keys left out are not bound', () => {
  const bound = allEditorKeys()
  for (const left of NOT_BOUND_NOTES_KEYS) expect(bound).not.toContain(left)
})

// The keys the global handler in Sidebar.tsx reads, with whether it needs ⌥.
function globalKeys(): Set<string> {
  const sidebar = repoFile('frontend/src/components/file-manager/Sidebar.tsx')
  return new Set([...sidebar.matchAll(/isShortcut\(e, '(.+?)'\)/g), ...sidebar.matchAll(/shortcutKey\(e\) === '(.+?)'/g)].map((m) => m[1]))
}
const lastKey = (tiptap: string) => tiptap.slice(tiptap.lastIndexOf('-') + 1).toLowerCase()

test('a table key may share a key with a global shortcut only when the clash is declared', () => {
  // The handler ignores Shift (and Alt, outside a browser), so ⌘⇧T would still start a task.
  const global = globalKeys()
  expect([...global]).toEqual(expect.arrayContaining(['/', 'e', 'j', 'k', 'n', 't', 'w']))
  const declared = GLOBAL_CLASHES.map((c) => c.tiptap)
  const sharing = [...EDITOR_SHORTCUTS.map((s) => s.tiptap), ...INHERITED_SHORTCUTS.flatMap((s) => s.tiptap)].filter((key) => global.has(lastKey(key)))
  expect(sharing.sort()).toEqual([...declared].sort())
})

test('the editor wins ⌘K, ⌘E and ⌥⌘T inside a document, and each is a key the global handler reads', () => {
  expect(GLOBAL_CLASHES.map((c) => c.keys)).toEqual(['⌘K', '⌘E', '⌥⌘T'])
  const global = globalKeys()
  const editorKeys = [...EDITOR_SHORTCUTS.map((s) => s.tiptap), ...INHERITED_SHORTCUTS.flatMap((s) => s.tiptap)]
  for (const clash of GLOBAL_CLASHES) {
    expect(global.has(clash.globalKey)).toBe(true)
    expect(lastKey(clash.tiptap)).toBe(clash.globalKey)
    expect(editorKeys).toContain(clash.tiptap)
    expect(clash.tiptap.includes('Alt')).toBe(clash.globalAlt)
  }
  expect(clashForAction('link')?.global).toBe('Quick-add a task or event')
  expect(clashForAction('bold')).toBeUndefined()
})

test('the defaults being replaced belong to the four extensions the editor wraps', () => {
  expect([...new Set(REPLACED_DEFAULTS.map(([name]) => name))].sort()).toEqual(['bulletList', 'codeBlock', 'orderedList', 'strike'])
  expect(replacedKeys('orderedList')).toEqual(['Mod-Shift-7'])
  expect(replacedKeys('code')).toEqual([])
})

test('a replaced default is bound again only when it moved to another action', () => {
  const bound = boundShortcuts().map((s) => s.tiptap)
  // TipTap's numbered list was ⌘⇧7, now the bulleted list's key: that is the point of dropping the default.
  expect(REPLACED_DEFAULTS.filter(([, key]) => bound.includes(key))).toEqual([['orderedList', 'Mod-Shift-7']])
})

test('the cheat sheet rows are the bound table rows and then the keys that already matched', () => {
  const rows = documentShortcutRows(true)
  expect(rows).toHaveLength(boundShortcuts().length + INHERITED_SHORTCUTS.length)
  expect(rows[0]).toEqual({ label: 'Strikethrough', keys: '⌘⇧X' })
  expect(rows[boundShortcuts().length]).toEqual({ label: 'Bold', keys: '⌘B' })
  expect(new Set(rows.map((r) => r.label)).size).toBe(rows.length)
})

test('a tooltip shows the key of its action', () => {
  expect(titleWithShortcut('Strikethrough', 'strike', true)).toBe('Strikethrough (⌘⇧X)')
  expect(titleWithShortcut('Strikethrough', 'strike', false)).toBe('Strikethrough (Ctrl+Shift+X)')
  expect(titleWithShortcut('Link', 'link', true)).toBe('Link (⌘K)')
  expect(titleWithShortcut('Nothing', 'strike', true, [])).toBe('Nothing')
})

describe('Windows and Linux', () => {
  test('⌘ is Ctrl, and the keys read the Windows way', () => {
    expect(keysFor(rowOf('strike')!, false)).toBe('Ctrl+Shift+X')
    expect(keysFor(rowOf('link')!, false)).toBe('Ctrl+K')
    expect(keysFor(rowOf('indent')!, false)).toBe('Ctrl+]')
    expect(keysFor(rowOf('codeBlock')!, false)).toBe('Ctrl+Shift+M')
    expect(keysFor(rowOf('clearFormatting')!, false)).toBe('Ctrl+\\')
    expect(tiptapFor(rowOf('strike')!, false)).toBe('Mod-Shift-x')
  })

  test('moving a list item uses Google Docs\' Ctrl+Shift+Up and Down, since ⌃⌘ is Mac only', () => {
    expect(keysFor(rowOf('moveUp')!, false)).toBe('Ctrl+Shift+↑')
    expect(keysFor(rowOf('moveDown')!, false)).toBe('Ctrl+Shift+↓')
    expect(tiptapFor(rowOf('moveUp')!, false)).toBe('Mod-Shift-ArrowUp')
    expect(tiptapFor(rowOf('moveDown')!, false)).toBe('Mod-Shift-ArrowDown')
    expect(tiptapFor(rowOf('moveUp')!, true)).toBe('Ctrl-Meta-ArrowUp')
  })

  test('the table has no key there: Ctrl+Alt+T opens a terminal on Linux', () => {
    expect(rowOf('table')?.win).toBeNull()
    expect(keysFor(rowOf('table')!, false)).toBeNull()
    expect(tiptapFor(rowOf('table')!, false)).toBeNull()
    expect(DESKTOP_RESERVED_KEYS.map((k) => k.tiptap)).toContain(rowOf('table')?.tiptap)
    expect(documentShortcutRows(false).map((r) => r.label)).not.toContain('Insert table')
    expect(titleWithShortcut('Insert table', 'table', false)).toBe('Insert table')
    expect(keysFor(rowOf('table')!, true)).toBe('⌥⌘T')
  })

  test('the rows are the table less the one with no key, with no Mac glyph left', () => {
    const rows = documentShortcutRows(false)
    expect(rows).toHaveLength(boundShortcuts().length - 1 + INHERITED_SHORTCUTS.length)
    for (const { keys } of rows) expect(keys).not.toMatch(/[⌘⌃⌥⇧]/)
    expect(rows.find((r) => r.label === 'Heading 1 to 5')?.keys).toBe('Ctrl+Alt+1–5')
  })

  test('no editor key is one the browsers or the desktop keep, on either platform', () => {
    for (const mac of [true, false]) {
      // Ctrl+Alt+T is a Linux desktop's, and the table (which has no key there) is the only row on it.
      const reserved = [...BROWSER_RESERVED_KEYS, ...(mac ? [] : DESKTOP_RESERVED_KEYS)].map((k) => k.tiptap.toLowerCase())
      for (const key of allEditorKeys(mac)) expect(reserved).not.toContain(key.toLowerCase())
    }
    // The reserved list is the ones browsers keep, including the three the task names.
    expect(BROWSER_RESERVED_KEYS.map((k) => k.tiptap)).toEqual(expect.arrayContaining(['Mod-Shift-n', 'Mod-Shift-t', 'Mod-w']))
  })
})

describe('the Mac app Format menu', () => {
  const swift = repoFile('macos/Sources/Inertia/Components/FormatMenu.swift')
  // FormatItem("Strikethrough", "strike", "⌘⇧X") with Swift's escapes undone.
  const items = [...swift.matchAll(/FormatItem\("((?:[^"\\]|\\.)+)", "([A-Za-z0-9]+)", "((?:[^"\\]|\\.)+)"\)/g)]
    .map(([, label, action, keys]) => ({ label, action, keys: keys.replace(/\\(.)/g, '$1') }))

  test('has an item for every bound table row and every key it also shows, and nothing else', () => {
    const byAction = (list: { action: string; label: string; keys: string }[]) => [...list].sort((a, b) => a.action.localeCompare(b.action))
    expect(byAction(items)).toEqual(byAction(formatMenuItems()))
  })

  test('lists no pending key', () => {
    for (const pending of EDITOR_SHORTCUTS.filter((s) => s.pending)) expect(items.map((i) => i.action)).not.toContain(pending.action)
  })

  test('its inherited items show keys the editor really has', () => {
    const inherited = INHERITED_SHORTCUTS.map((s) => s.keys)
    expect(inherited).toEqual(expect.arrayContaining(['⌘B', '⌘I', '⌘U', '⌘E', '⌘⌥0']))
    expect(formatMenuItems().filter((i) => i.action.startsWith('heading')).map((i) => i.keys)).toEqual(['⌘⌥1', '⌘⌥2', '⌘⌥3', '⌘⌥4', '⌘⌥5'])
  })

  test('sends the commands to the page as the event the editor listens for', () => {
    expect(EDITOR_COMMAND_EVENT).toBe('inertia:editor-command')
    expect(repoFile('macos/Sources/Inertia/Components/WorkspaceWebView.swift')).toContain(`'${EDITOR_COMMAND_EVENT}'`)
  })
})

test('docs/keyboard-shortcuts.md lists every editor shortcut with its keys, on both platforms', () => {
  const doc = repoFile('docs/keyboard-shortcuts.md')
  for (const mac of [true, false]) {
    for (const { label, keys } of documentShortcutRows(mac)) {
      expect(doc).toContain(label)
      expect(doc).toContain(keys)
    }
  }
  // The reserved dashed list key and the three paragraph-style keys are listed too.
  for (const row of EDITOR_SHORTCUTS.filter((s) => s.pending)) {
    expect(doc).toContain(row.label)
    expect(doc).toContain(row.keys)
    expect(doc).toContain(row.pending)
  }
  for (const reserved of RESERVED_KEYS) expect(doc).toContain(reserved.keys)
  for (const clash of GLOBAL_CLASHES) expect(doc).toContain(clash.keys)
  // The keys browsers and desktops keep are listed in their Windows form.
  const windowsForm = (tiptap: string) => tiptap.split('-').map((part) => (part === 'Mod' ? 'Ctrl' : part.length === 1 ? part.toUpperCase() : part)).join('+')
  for (const reserved of [...BROWSER_RESERVED_KEYS, ...DESKTOP_RESERVED_KEYS]) expect(doc).toContain(windowsForm(reserved.tiptap))
  expect(doc).not.toContain('⌘⌥⇧C')
})
