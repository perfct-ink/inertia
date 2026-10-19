import { InputRule, Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import DocumentLinkView from '@/components/editors/DocumentLinkView'

export interface DocumentLinkOptions {
  // Called when the user types `[[`, so the editor screen can open its picker.
  onTrigger: () => void
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    documentLink: {
      insertDocumentLink: (documentId: number) => ReturnType
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
    return { onTrigger: () => {} }
  },

  addAttributes() {
    return { documentId: { default: null } }
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
    }
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\[\[$/,
        // Removes the typed brackets and asks the screen to pick a document;
        // the chosen link is added with insertDocumentLink.
        handler: ({ state, range }) => {
          state.tr.delete(range.from, range.to)
          setTimeout(() => this.options.onTrigger(), 0)
        },
      }),
    ]
  },
})
