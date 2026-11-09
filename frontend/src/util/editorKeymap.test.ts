import type { Editor } from '@tiptap/core'
import { EDITOR_SHORTCUTS } from '@/data/editorShortcut'
import { editorKeymap } from './editorKeymap'

// An editor that records the commands run on it. `sinkListItem` and `liftListItem`
// succeed only for the node types in `works`. It has the cursor in no list, so the
// list and checklist commands built on the document do nothing.
function fakeEditor(works: string[] = []) {
  const calls: string[] = []
  const record = (name: string, result = true) => (...args: unknown[]) => { calls.push([name, ...args].join(':')); return result }
  const chain: Record<string, () => unknown> = {}
  for (const name of ['focus', 'unsetAllMarks', 'clearNodes']) chain[name] = () => { calls.push(`chain.${name}`); return chain }
  chain.run = () => { calls.push('chain.run'); return true }
  const doc = { type: { name: 'doc' } }
  const editor = {
    state: { selection: { $from: { depth: 0, node: () => doc }, to: 0 } },
    view: {},
    commands: {
      toggleStrike: record('toggleStrike'),
      toggleBulletList: record('toggleBulletList'),
      toggleOrderedList: record('toggleOrderedList'),
      toggleCodeBlock: record('toggleCodeBlock'),
      sinkListItem: (type: string) => record('sinkListItem', works.includes(type))(type),
      liftListItem: (type: string) => record('liftListItem', works.includes(type))(type),
    },
    chain: () => chain,
  } as unknown as Editor
  return { editor, calls }
}

test('every key of the table gets a handler', () => {
  const keymap = editorKeymap(fakeEditor().editor)
  expect(Object.keys(keymap).sort()).toEqual(EDITOR_SHORTCUTS.map((s) => s.tiptap).sort())
})

test('each key runs its command', () => {
  const { editor, calls } = fakeEditor()
  const keymap = editorKeymap(editor)
  keymap['Mod-Shift-x']()
  keymap['Mod-Shift-7']()
  keymap['Mod-Shift-9']()
  keymap['Mod-Shift-m']()
  expect(calls).toEqual(['toggleStrike', 'toggleBulletList', 'toggleOrderedList', 'toggleCodeBlock'])
  expect(keymap['Mod-Alt-Shift-c']).toBeUndefined()
})

test('clear formatting drops marks and resets blocks', () => {
  const { editor, calls } = fakeEditor()
  expect(editorKeymap(editor)['Mod-\\']()).toBe(true)
  expect(calls).toEqual(['chain.focus', 'chain.unsetAllMarks', 'chain.clearNodes', 'chain.run'])
})

test('indent nests a list item; a checklist line has nothing to nest under', () => {
  const list = fakeEditor(['listItem'])
  expect(editorKeymap(list.editor)['Mod-]']()).toBe(true)
  expect(list.calls).toEqual(['sinkListItem:listItem'])

  const task = fakeEditor(['workspaceTaskItem'])
  expect(editorKeymap(task.editor)['Mod-]']()).toBe(false)
  expect(task.calls).toEqual(['sinkListItem:listItem'])
})

test('outdent lifts a checklist line out first, then a list item', () => {
  const task = fakeEditor(['workspaceTaskItem'])
  expect(editorKeymap(task.editor)['Mod-[']()).toBe(true)
  expect(task.calls).toEqual(['liftListItem:workspaceTaskItem'])

  const list = fakeEditor(['listItem'])
  expect(editorKeymap(list.editor)['Mod-[']()).toBe(true)
  expect(list.calls).toEqual(['liftListItem:workspaceTaskItem', 'liftListItem:listItem'])

  expect(editorKeymap(fakeEditor().editor)['Mod-[']()).toBe(false)
})

test('the keys that work on the document leave the key alone outside a list', () => {
  const keymap = editorKeymap(fakeEditor().editor)
  expect(keymap['Ctrl-Meta-ArrowUp']()).toBe(false)
  expect(keymap['Ctrl-Meta-ArrowDown']()).toBe(false)
  expect(keymap['Mod-Shift-u']()).toBe(false)
})
