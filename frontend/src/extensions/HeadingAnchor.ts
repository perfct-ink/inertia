import type { Editor } from '@tiptap/core'
import Heading from '@tiptap/extension-heading'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { documentPath, idsToStore, indexOfAnchor, type HeadingInfo, type HeadingLink } from '@/data/heading'

// The editor's Heading with a stable `id` attribute, so a link can point at a
// heading (see data/heading.ts). The id is stored in the document, synced by
// collaboration, and never changed once set. collab-server/src/schema.ts
// mirrors the attribute; keep the two in step.
export const HeadingAnchor = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-heading-id'),
        renderHTML: (attributes: { id?: string | null }) => (attributes.id ? { 'data-heading-id': attributes.id } : {}),
      },
    }
  },
})

export interface HeadingPosition extends HeadingInfo {
  pos: number
}

// Every heading in an editor document, in order, with its position.
export function headingsInDoc(doc: ProseMirrorNode): HeadingPosition[] {
  const found: HeadingPosition[] = []
  doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') return true
    found.push({ pos, id: node.attrs.id || null, text: node.textContent.trim(), level: node.attrs.level })
    return false
  })
  return found
}

// The position of the heading an anchor points at, or null when there is none.
export function findHeadingPos(doc: ProseMirrorNode, anchor: string): number | null {
  const headings = headingsInDoc(doc)
  const index = indexOfAnchor(headings, anchor)
  return index === -1 ? null : headings[index].pos
}

// Stores an id on every heading that has text but no (or a repeated) id.
// Returns whether anything changed. Run it from one collaborator only, since
// two clients writing ids to the same heading would pick different ones.
export function assignHeadingIds(editor: Editor): boolean {
  const { state, view } = editor
  const headings = headingsInDoc(state.doc)
  const ids = idsToStore(headings)
  const tr = state.tr
  let changed = false
  headings.forEach(({ pos }, i) => {
    const id = ids[i]
    const node = state.doc.nodeAt(pos)
    if (!id || !node) return
    tr.setNodeMarkup(pos, undefined, { ...node.attrs, id })
    changed = true
  })
  if (changed) view.dispatch(tr.setMeta('addToHistory', false))
  return changed
}

// Links the selected text to a heading or, with nothing selected, inserts the
// heading's text as a link. The link is an ordinary link mark whose href is the
// heading's in-app path, so it needs nothing more in the document schema.
export function linkToHeading(editor: Editor, { documentId, anchor, text }: HeadingLink): void {
  const href = documentPath({ documentId, anchor })
  const chain = editor.chain().focus()
  if (editor.state.selection.empty) {
    chain.insertContent({ type: 'text', text, marks: [{ type: 'link', attrs: { href } }] }).run()
  } else {
    chain.setLink({ href }).run()
  }
}
