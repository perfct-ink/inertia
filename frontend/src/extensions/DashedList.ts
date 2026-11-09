import { wrappingInputRule, type CommandProps } from '@tiptap/core'
import BulletList from '@tiptap/extension-bullet-list'
import ListItem from '@tiptap/extension-list-item'
import type { Node as ProseMirrorNode, ResolvedPos } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'
import { canJoin } from '@tiptap/pm/transform'
import {
  DEFAULT_LIST_STYLE,
  LIST_STYLE_HTML_ATTRIBUTE,
  indentedListStyle,
  listAction,
  listStyleHtmlAttributes,
  listStyleOf,
  type ListStyle,
} from '@/data/listStyle'

// The editor keys for the two bullet list styles; null means no key. This is the
// one place to bind a key: Apple Notes uses ⌘⇧7 for bullets and ⌘⇧8 for dashes
// (docs/keyboard-shortcuts.md, "Planned bindings"), which the shortcut rebind
// task sets here. Today only the bullet list has its TipTap default.
export const LIST_SHORTCUTS: Record<ListStyle, string | null> = { bullet: 'Mod-Shift-8', dashed: null }

// Typing "- ", "+ " or "* " at the start of a line starts a bullet list, as in TipTap,
// and an en or em dash then a space starts a dashed list (macOS turns "--" into an en
// dash while you type). A plain "- " is never turned into a dashed list.
const BULLET_INPUT = /^\s*([-+*])\s$/
const DASHED_INPUT = /^\s*[\u2013\u2014]\s$/

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dashedList: {
      // A paragraph becomes a dashed list, a list of the other style changes style
      // in place, and an item of a dashed list leaves the list.
      toggleDashedList: () => ReturnType
    }
  }
}

interface ListAt {
  node: ProseMirrorNode
  pos: number
  depth: number
}

// The lists of the given node types around a position, innermost first.
function listsAround($pos: ResolvedPos, names: string[]): ListAt[] {
  const found: ListAt[] = []
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth)
    if (names.includes(node.type.name)) found.push({ node, pos: $pos.before(depth), depth })
  }
  return found
}

const sameList = (a: ProseMirrorNode, b: ProseMirrorNode) =>
  a.type === b.type && listStyleOf(a.attrs.listStyle) === listStyleOf(b.attrs.listStyle)

// Joins the bullet list around the cursor to the lists just above and below it when
// they have the same style. TipTap's own join looks at the type only, which would
// pull a new bullet list into a dashed list above it (or the reverse).
function joinNeighbours(tr: Transaction): boolean {
  const [list] = listsAround(tr.selection.$from, ['bulletList'])
  if (!list) return true
  let start = list.pos
  const before = tr.doc.resolve(start).nodeBefore
  if (before && sameList(before, list.node) && canJoin(tr.doc, start)) {
    tr.join(start)
    start -= before.nodeSize
  }
  const merged = tr.doc.nodeAt(start)
  if (!merged) return true
  const end = start + merged.nodeSize
  const after = tr.doc.resolve(end).nodeAfter
  if (after && sameList(merged, after) && canJoin(tr.doc, end)) tr.join(end)
  return true
}

// A bullet list that also comes in a dashed style: the same node with a
// `listStyle` attribute ("bullet" or "dashed", see data/listStyle.ts). It
// replaces the stock BulletList in the editor. collab-server/src/schema.ts
// mirrors the attribute and its default; keep the two in step, and deploy the
// collab server with the frontend.
export const DashedList = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyle: {
        default: DEFAULT_LIST_STYLE,
        parseHTML: (element: HTMLElement) => listStyleOf(element.getAttribute(LIST_STYLE_HTML_ATTRIBUTE)),
        renderHTML: (attributes: { listStyle?: unknown }) => listStyleHtmlAttributes(attributes.listStyle),
      },
    }
  },

  addCommands() {
    // Both buttons behave alike: choosing a style takes the item out of a list of that
    // style, changes the style of a list of the other one, and otherwise makes a list.
    const choose = (style: ListStyle) => ({ state, tr, dispatch, chain, commands }: CommandProps) => {
      const [list] = listsAround(state.selection.$from, ['bulletList', 'orderedList', 'workspaceTaskList'])
      const current = list ? listStyleOf(list.node.attrs.listStyle) : DEFAULT_LIST_STYLE
      const action = listAction(list ? list.node.type.name : null, current, style)

      if (action === 'unlist') {
        return commands.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks)
      }
      if (list && (action === 'restyle' || action === 'convert')) {
        if (dispatch) {
          tr.setNodeMarkup(list.pos, this.type, { listStyle: style })
          joinNeighbours(tr)
        }
        return true
      }
      return chain()
        // Like TipTap's list toggle: turn a block that can't sit in a list (a heading) into a paragraph first.
        .command(({ can, commands: inner }) => (can().wrapInList(this.type, { listStyle: style }) ? true : inner.clearNodes()))
        .wrapInList(this.type, { listStyle: style })
        .command(({ tr: wrapped }) => joinNeighbours(wrapped))
        .run()
    }

    return {
      ...this.parent?.(),
      toggleBulletList: () => choose('bullet'),
      toggleDashedList: () => choose('dashed'),
    }
  },

  addKeyboardShortcuts() {
    const shortcuts: Record<string, () => boolean> = {}
    if (LIST_SHORTCUTS.bullet) shortcuts[LIST_SHORTCUTS.bullet] = () => this.editor.commands.toggleBulletList()
    if (LIST_SHORTCUTS.dashed) shortcuts[LIST_SHORTCUTS.dashed] = () => this.editor.commands.toggleDashedList()
    return shortcuts
  },

  addInputRules() {
    // A new list joins the list above it only when that has the same style.
    const joinsStyle = (style: ListStyle) => (_match: unknown, node: ProseMirrorNode) => listStyleOf(node.attrs.listStyle) === style
    return [
      wrappingInputRule({ find: BULLET_INPUT, type: this.type, getAttributes: () => ({ listStyle: 'bullet' }), joinPredicate: joinsStyle('bullet') }),
      wrappingInputRule({ find: DASHED_INPUT, type: this.type, getAttributes: () => ({ listStyle: 'dashed' }), joinPredicate: joinsStyle('dashed') }),
    ]
  },
})

// Tab on a list item starts a nested list with the default style. Give a list that
// holds only the item just indented the style of the list around it.
function keepIndentedListStyle(tr: Transaction): void {
  const [nested, parent] = listsAround(tr.selection.$from, ['bulletList'])
  // The parent list is the one directly around the nested list's item (list > item > list).
  if (!nested || !parent || parent.depth !== nested.depth - 2) return
  const current = listStyleOf(nested.node.attrs.listStyle)
  const style = indentedListStyle(listStyleOf(parent.node.attrs.listStyle), current, nested.node.childCount)
  if (style !== current) tr.setNodeMarkup(nested.pos, undefined, { ...nested.node.attrs, listStyle: style })
}

// The stock list item, except that indenting an item with Tab keeps the list's style.
// Indenting, outdenting and Enter work as before.
export const StyledListItem = ListItem.extend({
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Tab: () => this.editor.commands.command(({ commands, tr }) => {
        if (!commands.sinkListItem(this.name)) return false
        keepIndentedListStyle(tr)
        return true
      }),
    }
  },
})
