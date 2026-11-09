import type { Editor } from '@tiptap/core'
import { insertTaskList, moveListItem, toggleTaskDone } from './editorCommand'

// A fake node: a type name, a size and the children a list has.
interface FakeNode {
  type: { name: string }
  nodeSize: number
  childCount: number
  child: (i: number) => FakeNode
}
const leaf = (name: string, nodeSize = 6): FakeNode => ({ type: { name }, nodeSize, childCount: 0, child: () => { throw new Error('leaf') } })
const parent = (name: string, children: FakeNode[]): FakeNode => ({
  type: { name },
  nodeSize: children.reduce((sum, c) => sum + c.nodeSize, 2),
  childCount: children.length,
  child: (i) => children[i],
})

// An editor with the cursor in item `index` of a three-item list (each item is 6 long,
// the first starts at 1): doc > list > item > paragraph. `to` is where the selection ends.
function listEditor(listName: string, itemName: string, index: number, to?: number) {
  const items = [0, 1, 2].map(() => leaf(itemName))
  const list = parent(listName, items)
  const doc = parent('doc', [list])
  const start = 1 + index * 6
  const nodes = [doc, list, items[index], leaf('paragraph')]
  const calls: string[] = []
  const tr = {
    delete: (from: number, end: number) => { calls.push(`delete ${from}-${end}`); return tr },
    insert: (pos: number, node: FakeNode) => { calls.push(`insert ${pos} ${node.type.name}#${items.indexOf(node)}`); return tr },
    scrollIntoView: () => tr,
  }
  const $from = {
    depth: 3,
    node: (d: number) => nodes[d],
    before: (d: number) => (d === 2 ? start : 0),
    after: (d: number) => (d === 2 ? start + 6 : 0),
    index: (d: number) => (d === 1 ? index : 0),
  }
  const editor = {
    state: { selection: { $from, to: to ?? start + 3 }, tr },
    view: { dispatch: (t: unknown) => calls.push(t === tr ? 'dispatch' : 'dispatch other') },
  } as unknown as Pick<Editor, 'state' | 'view'>
  return { editor, calls }
}

// An editor with the cursor in no list.
function plainEditor() {
  const doc = parent('doc', [])
  const $from = { depth: 1, node: () => doc, before: () => 0, after: () => 0, index: () => 0 }
  return { state: { selection: { $from, to: 1 } }, view: { dispatch: () => { throw new Error('should not dispatch') } } } as unknown as Pick<Editor, 'state' | 'view'>
}

describe('moveListItem', () => {
  test('moving up puts the item above its neighbour by moving the neighbour below it', () => {
    const { editor, calls } = listEditor('bulletList', 'listItem', 1)
    expect(moveListItem(editor, -1)).toBe(true)
    expect(calls).toEqual(['delete 1-7', 'insert 7 listItem#0', 'dispatch'])
  })

  test('moving down moves the neighbour above it', () => {
    const { editor, calls } = listEditor('orderedList', 'listItem', 1)
    expect(moveListItem(editor, 1)).toBe(true)
    expect(calls).toEqual(['delete 13-19', 'insert 7 listItem#2', 'dispatch'])
  })

  test('works on checklist lines too', () => {
    const { editor, calls } = listEditor('workspaceTaskList', 'workspaceTaskItem', 2)
    expect(moveListItem(editor, -1)).toBe(true)
    expect(calls).toEqual(['delete 7-13', 'insert 13 workspaceTaskItem#1', 'dispatch'])
  })

  test('at the top or bottom of the list it does nothing but still takes the key', () => {
    const top = listEditor('bulletList', 'listItem', 0)
    expect(moveListItem(top.editor, -1)).toBe(true)
    expect(top.calls).toEqual([])
    const bottom = listEditor('bulletList', 'listItem', 2)
    expect(moveListItem(bottom.editor, 1)).toBe(true)
    expect(bottom.calls).toEqual([])
  })

  test('leaves the key alone outside a list, and when the selection leaves the item', () => {
    expect(moveListItem(plainEditor(), 1)).toBe(false)
    const { editor, calls } = listEditor('bulletList', 'listItem', 1, 20)
    expect(moveListItem(editor, 1)).toBe(false)
    expect(calls).toEqual([])
  })
})

describe('toggleTaskDone', () => {
  function taskEditor(dom: Node | null) {
    const { editor } = listEditor('workspaceTaskList', 'workspaceTaskItem', 1)
    return { state: editor.state, view: { nodeDOM: (pos: number) => (pos === 7 ? dom : null) } } as unknown as Pick<Editor, 'state' | 'view'>
  }

  test('presses the line\'s checkbox', () => {
    const li = document.createElement('li')
    const box = document.createElement('input')
    box.type = 'checkbox'
    li.appendChild(box)
    let clicks = 0
    box.addEventListener('click', () => { clicks += 1 })
    expect(toggleTaskDone(taskEditor(li))).toBe(true)
    expect(clicks).toBe(1)
  })

  test('does nothing for a line that is not saved as a task yet (no checkbox)', () => {
    expect(toggleTaskDone(taskEditor(document.createElement('li')))).toBe(false)
    expect(toggleTaskDone(taskEditor(null))).toBe(false)
  })

  test('does nothing outside a checklist line', () => {
    expect(toggleTaskDone(plainEditor())).toBe(false)
    expect(toggleTaskDone(listEditor('bulletList', 'listItem', 1).editor)).toBe(false)
  })
})

describe('insertTaskList', () => {
  test('replaces the selection with a task list holding one empty task line', () => {
    const made: string[] = []
    const nodes = {
      workspaceTaskList: { create: (_a: unknown, children: unknown[]) => { made.push(`list(${children.length})`); return 'LIST' } },
      workspaceTaskItem: { create: (_a: unknown, child: unknown) => { made.push(`item(${child})`); return 'ITEM' } },
      paragraph: { create: () => 'P' },
    }
    const dispatched: unknown[] = []
    let focused = 0
    const editor = {
      state: { schema: { nodes }, tr: { replaceSelectionWith: (node: unknown) => ({ replaced: node }) } },
      view: { dispatch: (tr: unknown) => dispatched.push(tr) },
      commands: { focus: () => { focused += 1; return true } },
    } as unknown as Pick<Editor, 'state' | 'view' | 'commands'>
    expect(insertTaskList(editor)).toBe(true)
    expect(made).toEqual(['item(P)', 'list(1)'])
    expect(dispatched).toEqual([{ replaced: 'LIST' }])
    expect(focused).toBe(1)
  })
})
