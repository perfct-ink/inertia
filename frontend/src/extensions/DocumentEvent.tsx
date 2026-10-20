import { InputRule, Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import DocumentEventView from '@/components/editors/DocumentEventView'

export interface DocumentEventOptions {
  // Called when the user types `/event `, so the editor screen can ask for the event.
  onTrigger: () => void
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    documentEvent: {
      insertDocumentEvent: (eventId: number) => ReturnType
    }
  }
}

// An inline chip for a calendar event made from the document. Only the event id
// is stored; the chip shows the event's current title and date and edits its
// date, so the document and the calendar stay one thing.
// KEEP IN SYNC with collab-server/src/schema.ts.
export const DocumentEvent = Node.create<DocumentEventOptions>({
  name: 'documentEvent',
  group: 'inline',
  inline: true,
  atom: true,

  addOptions() {
    return { onTrigger: () => {} }
  },

  addAttributes() {
    return { eventId: { default: null } }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="documentEvent"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-type': 'documentEvent' }, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DocumentEventView)
  },

  addCommands() {
    return {
      insertDocumentEvent: (eventId) => ({ commands }) =>
        commands.insertContent([{ type: this.name, attrs: { eventId } }, { type: 'text', text: ' ' }]),
    }
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\/event $/,
        handler: ({ state, range }) => {
          state.tr.delete(range.from, range.to)
          setTimeout(() => this.options.onTrigger(), 0)
        },
      }),
    ]
  },
})
