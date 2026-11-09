import type { Editor } from '@tiptap/core'
import { boundShortcuts, formatMenuItems, tiptapFor } from '@/data/editorShortcut'
import { editorCommands, editorKeymap } from './editorKeymap'

// An editor that records the commands run on it. `sinkListItem` and `liftListItem`
// succeed only for the node types in `works`. It has the cursor in no list, so the
// list and checklist commands built on the document do nothing.
function fakeEditor(works: string[] = []) {
  const calls: string[] = []
  const record = (name: string, result = true) => (...args: unknown[]) => { calls.push([name, ...args].join(':')); return result }
  const chain: Record<string, () => unknown> = {}
  const chainStep = (name: string) => (...args: unknown[]) => { calls.push(['chain.' + name, ...args.map((a) => JSON.stringify(a))].join(':')); return chain }
  for (const name of ['focus', 'unsetAllMarks', 'clearNodes', 'toggleBold', 'toggleItalic', 'toggleUnderline', 'toggleCode', 'setParagraph', 'toggleHeading', 'insertTable']) chain[name] = chainStep(name)
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

test('every bound key of the table gets a handler, and the pending dashed list gets none', () => {
  const keymap = editorKeymap(fakeEditor().editor)
  expect(Object.keys(keymap).sort()).toEqual(boundShortcuts().map((s) => s.tiptap).sort())
  expect(keymap['Mod-Shift-8']).toBeUndefined()
})

test('Windows and Linux get Ctrl+Shift+Up and Down for moving, and no table key', () => {
  const keymap = editorKeymap(fakeEditor().editor, undefined, false)
  expect(Object.keys(keymap).sort()).toEqual(boundShortcuts().flatMap((s) => tiptapFor(s, false) ?? []).sort())
  expect(keymap['Mod-Shift-ArrowUp']).toBeDefined()
  expect(keymap['Mod-Shift-ArrowDown']).toBeDefined()
  expect(keymap['Ctrl-Meta-ArrowUp']).toBeUndefined()
  expect(keymap['Mod-Alt-t']).toBeUndefined()
  expect(keymap['Mod-k']).toBeDefined()
})

test('⌘K opens the screen\'s link dialog, and does nothing without one', () => {
  let opened = 0
  const keymap = editorKeymap(fakeEditor().editor, undefined, true, { openLinkDialog: () => { opened++ } })
  expect(keymap['Mod-k']()).toBe(true)
  expect(opened).toBe(1)
  expect(editorKeymap(fakeEditor().editor)['Mod-k']()).toBe(false)
})

test('⌥⌘T puts a 3 by 3 table with a header row at the cursor', () => {
  const { editor, calls } = fakeEditor()
  expect(editorKeymap(editor)['Mod-Alt-t']()).toBe(true)
  expect(calls).toEqual(['chain.focus', 'chain.insertTable:{"rows":3,"cols":3,"withHeaderRow":true}', 'chain.run'])
})

test('the Format menu runs a command for every one of its items', () => {
  for (const { action } of formatMenuItems()) {
    const { editor } = fakeEditor()
    expect(typeof editorCommands(editor)[action]).toBe('function')
  }
})

test('the menu\'s formatting commands run on the editor', () => {
  const { editor, calls } = fakeEditor()
  const run = editorCommands(editor)
  run.bold()
  run.italic()
  run.underline()
  run.inlineCode()
  run.normalText()
  run.heading2()
  expect(calls).toEqual([
    'chain.focus', 'chain.toggleBold', 'chain.run',
    'chain.focus', 'chain.toggleItalic', 'chain.run',
    'chain.focus', 'chain.toggleUnderline', 'chain.run',
    'chain.focus', 'chain.toggleCode', 'chain.run',
    'chain.focus', 'chain.setParagraph', 'chain.run',
    'chain.focus', 'chain.toggleHeading:{"level":2}', 'chain.run',
  ])
})

test('the dashed list does nothing until its block exists', () => {
  const { editor, calls } = fakeEditor()
  expect(editorCommands(editor).dashedList()).toBe(false)
  expect(calls).toEqual([])
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
