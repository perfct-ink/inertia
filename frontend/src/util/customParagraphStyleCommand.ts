import type { Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { refreshedAttrs, snapshotAttrs, type CustomParagraphStyle, type StyleAttrs } from '@/data/customParagraphStyle'

// Editor commands for custom paragraph styles. The rules for what a paragraph's
// style attributes should be live in data/customParagraphStyle.ts; this applies
// them to a document.

// Puts a custom style on the paragraph the cursor is in (a heading becomes a
// paragraph first). The paragraph keeps a copy of the style, so it looks the
// same to everyone who opens the document.
export function applyCustomParagraphStyle(editor: Editor, style: CustomParagraphStyle, ownerId: number | null): void {
  editor.chain().focus().setParagraph().updateAttributes('paragraph', snapshotAttrs(style, ownerId)).run()
}

export interface StyleRefresh {
  pos: number
  attrs: StyleAttrs
}

// The paragraphs of `doc` whose custom-style attributes are out of date for
// `userId` given their full, fresh style list (see refreshedAttrs).
export function styleRefreshes(doc: ProseMirrorNode, styles: CustomParagraphStyle[], userId: number): StyleRefresh[] {
  const refreshes: StyleRefresh[] = []
  doc.descendants((node, pos) => {
    if (node.type.name !== 'paragraph') return true
    const attrs = refreshedAttrs(node.attrs, styles, userId)
    if (attrs) refreshes.push({ pos, attrs })
    return false
  })
  return refreshes
}

// Brings the copies of `userId`'s styles in the open document up to date: an
// edited style's name and formatting are copied in, and a deleted style's
// paragraphs become Body. One transaction, kept out of undo history so Undo
// doesn't put an old copy back. Returns whether anything changed.
export function refreshCustomParagraphStyles(editor: Editor, styles: CustomParagraphStyle[], userId: number): boolean {
  const refreshes = styleRefreshes(editor.state.doc, styles, userId)
  if (refreshes.length === 0) return false
  const { tr } = editor.state
  for (const { pos, attrs } of refreshes) {
    const node = tr.doc.nodeAt(pos)
    if (node) tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs })
  }
  editor.view.dispatch(tr.setMeta('addToHistory', false))
  return true
}
