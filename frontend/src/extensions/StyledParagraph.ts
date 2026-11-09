import Paragraph from '@tiptap/extension-paragraph'
import { styleDecoration } from '@/data/customParagraphStyle'

// A paragraph with a named style (title, subtitle, quote, caption, monospace);
// absent or "body" is the plain paragraph. A custom style (data/customParagraphStyle.ts)
// is "custom-<id>" in `style`, with a copy of the style's name (`styleName`) and
// resolved formatting (`styleProps`) beside it; the paragraph is drawn from that
// copy, so it looks the same to everyone. KEEP IN SYNC with collab-server/src/schema.ts.
export const StyledParagraph = Paragraph.extend({
  addAttributes() {
    return {
      style: {
        default: 'body',
        parseHTML: (element) => element.getAttribute('data-style') ?? 'body',
        renderHTML: (attributes) => (attributes.style && attributes.style !== 'body' ? { 'data-style': attributes.style } : {}),
      },
      styleName: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-style-name'),
        renderHTML: (attributes) => (attributes.styleName && attributes.styleProps ? { 'data-style-name': attributes.styleName } : {}),
      },
      // The look is drawn here, from the same attributes (the copy is ignored unless `style` is custom).
      styleProps: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-style-props'),
        renderHTML: (attributes) => (attributes.styleProps ? { 'data-style-props': attributes.styleProps, ...styleDecoration(attributes) } : {}),
      },
    }
  },
})
