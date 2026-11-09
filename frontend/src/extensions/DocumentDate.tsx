import { InputRule, Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import DocumentDateView from '@/components/editors/DocumentDateView'
import { DATE_CHIP, DATE_TRIGGER, triggerDate } from '@/data/documentDate'

export interface DocumentDateOptions {
  // Called when the user types `/date `, `@date ` or `@2026-12-01 `, so the
  // editor screen can add the date. `date` is the day typed, if any; `line` is
  // the text of the line it was typed on (the new calendar entry's label).
  onTrigger: (date: string | null, line: string) => void
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    documentDate: {
      insertDocumentDate: (dateId: number) => ReturnType
    }
  }
}

// An inline chip for a date picked or typed in a document. Only the id of its
// calendar entry is stored; the chip shows the entry's current day and edits it,
// so the document and the calendar stay one thing.
// KEEP IN SYNC with collab-server/src/schema.ts.
export const DocumentDate = Node.create<DocumentDateOptions>({
  name: DATE_CHIP,
  group: 'inline',
  inline: true,
  atom: true,

  addOptions() {
    return { onTrigger: () => {} }
  },

  addAttributes() {
    return {
      dateId: {
        default: null,
        parseHTML: (element) => Number(element.getAttribute('data-date-id')) || null,
        renderHTML: (attributes) => (attributes.dateId ? { 'data-date-id': attributes.dateId } : {}),
      },
    }
  },

  parseHTML() {
    return [{ tag: `span[data-type="${DATE_CHIP}"]` }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-type': DATE_CHIP }, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(DocumentDateView)
  },

  addCommands() {
    return {
      insertDocumentDate: (dateId) => ({ commands }) =>
        commands.insertContent([{ type: this.name, attrs: { dateId } }, { type: 'text', text: ' ' }]),
    }
  },

  addInputRules() {
    return [
      new InputRule({
        find: DATE_TRIGGER,
        handler: ({ state, range, match }) => {
          // Keep the space or line start the trigger followed; remove the trigger itself.
          state.tr.delete(range.from + match[1].length, range.to)
          const date = triggerDate(match)
          // After the deletion has been applied, so the line text is what is left.
          setTimeout(() => this.options.onTrigger(date, this.editor.state.selection.$from.parent.textContent), 0)
        },
      }),
    ]
  },
})
