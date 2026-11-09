import { Node, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { ReactNodeViewRenderer } from '@tiptap/react'
import DocumentLinkView from '@/components/editors/DocumentLinkView'
import { DOCUMENT_LINK_TRIGGERS, documentIdFromAttribute, documentLinkTrigger, type DocumentLinkTrigger } from '@/data/documentLink'

export interface DocumentLinkOptions {
  // Which typed triggers open the picker ("[[" and "@" by default).
  triggers: readonly DocumentLinkTrigger[]
  // Called when the user types a trigger, so the editor screen can open its
  // picker. The typed characters are not left in the text: if the picker is
  // cancelled, restoreDocumentLinkTrigger puts them back.
  onTrigger: (trigger: DocumentLinkTrigger) => void
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    documentLink: {
      insertDocumentLink: (documentId: number) => ReturnType
      restoreDocumentLinkTrigger: (typed: string) => ReturnType
    }
  }
}

// An inline link to another document in the Space. Only the document id is
// stored; the view shows the target's current title, so a rename updates it.
// KEEP IN SYNC with collab-server/src/schema.ts.
export const DocumentLink = Node.create<DocumentLinkOptions>({
  name: 'documentLink',
  group: 'inline',
  inline: true,
  atom: true,

  addOptions() {
    return { triggers: DOCUMENT_LINK_TRIGGERS, onTrigger: () => {} }
  },

  addAttributes() {
    return {
      documentId: {
        default: null,
        parseHTML: (element) => documentIdFromAttribute(element.getAttribute('data-document-id')),
        renderHTML: (attributes) => (attributes.documentId == null ? {} : { 'data-document-id': attributes.documentId }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="documentLink"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-type': 'documentLink' }, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DocumentLinkView)
  },

  addCommands() {
    return {
      insertDocumentLink: (documentId) => ({ commands }) =>
        commands.insertContent([{ type: this.name, attrs: { documentId } }, { type: 'text', text: ' ' }]),
      restoreDocumentLinkTrigger: (typed) => ({ commands }) => (typed ? commands.insertContent(typed) : true),
    }
  },

  addProseMirrorPlugins() {
    const { triggers, onTrigger } = this.options
    return [
      new Plugin({
        key: new PluginKey('documentLinkTrigger'),
        props: {
          // Typing "[[" or a word-starting "@" swallows the keystroke and asks the
          // screen to pick a document. Not in code, where those characters are literal.
          handleTextInput: (view, from, to, text) => {
            if (from !== to || !view.editable) return false
            const $from = view.state.doc.resolve(from)
            if ($from.parent.type.spec.code || $from.marks().some((mark) => mark.type.name === 'code')) return false
            const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc')
            const match = documentLinkTrigger(textBefore, text, triggers)
            if (!match) return false
            if (match.remove > 0) view.dispatch(view.state.tr.delete(from - match.remove, from))
            onTrigger(match.trigger)
            return true
          },
        },
      }),
    ]
  },
})
