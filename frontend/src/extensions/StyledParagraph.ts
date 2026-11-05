import Paragraph from '@tiptap/extension-paragraph'

// A paragraph with a named style (title, subtitle, quote, caption, monospace);
// absent or "body" is the plain paragraph. KEEP IN SYNC with collab-server/src/schema.ts.
export const StyledParagraph = Paragraph.extend({
  addAttributes() {
    return {
      style: {
        default: 'body',
        parseHTML: (element) => element.getAttribute('data-style') ?? 'body',
        renderHTML: (attributes) => (attributes.style && attributes.style !== 'body' ? { 'data-style': attributes.style } : {}),
      },
    }
  },
})
