import type { Editor } from '@tiptap/core'

type ViewEditor = Pick<Editor, 'state' | 'view' | 'commands'>

// Starts a checklist at the cursor: a task list with one empty task line. The
// toolbar button and the checklist shortcut both call it.
export function insertTaskList(editor: ViewEditor): boolean {
  const { state, view } = editor
  const { workspaceTaskList, workspaceTaskItem, paragraph } = state.schema.nodes
  const node = workspaceTaskList.create(null, [workspaceTaskItem.create(null, paragraph.create())])
  view.dispatch(state.tr.replaceSelectionWith(node))
  editor.commands.focus()
  return true
}

// The depth of the nearest ancestor of the cursor whose node type is one of `names`
// (a bulleted or numbered item, a checklist line), or null when it is in none.
function ancestorDepth(editor: Pick<Editor, 'state'>, names: string[]): number | null {
  const { $from } = editor.state.selection
  for (let depth = $from.depth; depth > 0; depth--) {
    if (names.includes($from.node(depth).type.name)) return depth
  }
  return null
}

// Marks the checklist line the cursor is in done, or not done again. It presses the
// line's own checkbox (WorkspaceTaskItemView), so the keystroke saves the task the
// same way a click does, errors included. A line not yet saved as a task has no
// checkbox, and nothing happens.
export function toggleTaskDone(editor: Pick<Editor, 'state' | 'view'>): boolean {
  const depth = ancestorDepth(editor, ['workspaceTaskItem'])
  if (depth === null) return false
  const dom = editor.view.nodeDOM(editor.state.selection.$from.before(depth))
  const box = dom instanceof HTMLElement ? dom.querySelector<HTMLInputElement>('input[type="checkbox"]') : null
  if (!box) return false
  box.click()
  return true
}

// Moves the list item the cursor is in above or below its neighbour in the same
// list. It moves the neighbour (delete it, put it back on the other side), so the
// item being edited keeps its place in the document, its cursor and its task link.
// At the top or bottom of the list there is nothing to move, and the key is still
// taken (so the page doesn't act on it).
export function moveListItem(editor: Pick<Editor, 'state' | 'view'>, direction: -1 | 1): boolean {
  const depth = ancestorDepth(editor, ['listItem', 'workspaceTaskItem'])
  if (depth === null) return false
  const { state, view } = editor
  const { $from, to } = state.selection
  // Only a selection inside one item: moving the neighbour past several would not be one swap.
  if (to > $from.after(depth)) return false

  const list = $from.node(depth - 1)
  const index = $from.index(depth - 1)
  const neighbourIndex = index + direction
  if (neighbourIndex < 0 || neighbourIndex >= list.childCount) return true

  const item = list.child(index)
  const neighbour = list.child(neighbourIndex)
  const itemStart = $from.before(depth)
  const itemEnd = itemStart + item.nodeSize
  const tr = state.tr
  if (direction === -1) {
    tr.delete(itemStart - neighbour.nodeSize, itemStart)
    tr.insert(itemEnd - neighbour.nodeSize, neighbour)
  } else {
    tr.delete(itemEnd, itemEnd + neighbour.nodeSize)
    tr.insert(itemStart, neighbour)
  }
  view.dispatch(tr.scrollIntoView())
  return true
}
