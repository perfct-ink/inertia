import { Extension, getMarkRange, type Editor } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { BROKEN_LINK_TITLE } from '@/data/brokenLink'
import { documentPath, type HeadingLink } from '@/data/heading'

// Marks links whose target document or heading is gone (see data/brokenLink.ts
// for how that is decided). The marking is a decoration: it exists only in this
// browser's view, so it is never saved, never synced to collaborators, and costs
// the document schema nothing. The list of broken hrefs is set from outside with
// `setBrokenLinks`; styles for the class are in view/document/ProseMirror.scss.
export const BROKEN_LINK_CLASS = 'document-link--broken'

export const brokenLinksKey = new PluginKey<ReadonlySet<string>>('brokenLinks')

// The decorations for every run of text whose link mark has a broken href.
function brokenLinkDecorations(doc: ProseMirrorNode, hrefs: ReadonlySet<string>): DecorationSet {
  const decorations: Decoration[] = []
  doc.descendants((node, pos) => {
    if (!node.isText) return
    const href = node.marks.find((mark) => mark.type.name === 'link')?.attrs.href
    if (typeof href === 'string' && hrefs.has(href)) {
      decorations.push(Decoration.inline(pos, pos + node.nodeSize, { class: BROKEN_LINK_CLASS, title: BROKEN_LINK_TITLE }))
    }
  })
  return DecorationSet.create(doc, decorations)
}

export const BrokenLinks = Extension.create({
  name: 'brokenLinks',

  addProseMirrorPlugins() {
    return [
      new Plugin<ReadonlySet<string>>({
        key: brokenLinksKey,
        state: {
          init: () => new Set<string>(),
          apply: (tr, hrefs) => tr.getMeta(brokenLinksKey) ?? hrefs,
        },
        props: {
          decorations(state) {
            const hrefs = brokenLinksKey.getState(state)
            return hrefs && hrefs.size > 0 ? brokenLinkDecorations(state.doc, hrefs) : null
          },
        },
      }),
    ]
  },
})

// Sets which hrefs show as broken (an empty set clears them). A transaction with
// no steps, so nothing is saved, synced or added to the undo history.
export function setBrokenLinks(editor: Editor, hrefs: ReadonlySet<string>): void {
  if (editor.isDestroyed) return
  editor.view.dispatch(editor.state.tr.setMeta(brokenLinksKey, hrefs))
}

// A link in the editor: where its text starts and ends, and the text.
export interface LinkRange {
  from: number
  to: number
  text: string
}

// The whole link at `pos` if it still carries `href` (the document may have
// changed since the link was clicked), or null.
export function linkRangeAt(editor: Editor, pos: number, href: string): LinkRange | null {
  const { doc, schema } = editor.state
  if (pos < 0 || pos > doc.content.size) return null
  const range = getMarkRange(doc.resolve(pos), schema.marks.link)
  if (!range) return null
  const current = doc.nodeAt(range.from)?.marks.find((mark) => mark.type === schema.marks.link)?.attrs.href
  return current === href ? { ...range, text: doc.textBetween(range.from, range.to) } : null
}

// Points a link at another heading or document, keeping its text.
export function relinkTo(editor: Editor, range: LinkRange, { documentId, anchor }: HeadingLink): void {
  editor.chain().focus().setTextSelection(range).setLink({ href: documentPath({ documentId, anchor }) }).setTextSelection(range.to).run()
}

// Drops a link and keeps its text.
export function removeLinkAt(editor: Editor, range: LinkRange): void {
  editor.chain().focus().setTextSelection(range).unsetMark('link').setTextSelection(range.to).run()
}
