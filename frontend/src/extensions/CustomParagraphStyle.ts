import { Extension } from '@tiptap/core'
import { customStyleHtmlAttributes, parseSnapshot } from '@/data/customParagraphStyle'

// Lets a paragraph carry the formatting of a custom paragraph style (see
// data/customParagraphStyle.ts). The paragraph's `style` attribute (in
// StyledParagraph) refers to the style as "custom-<id>"; `styleProps` is a copy
// of its resolved formatting, and it is what gets drawn, as inline CSS and
// data-style-base (the base style's own look comes from ProseMirror.scss).
// The copy is only drawn while `style` is a custom reference, and always
// through sanitizeSnapshot, because a document can hold values from another
// person. collab-server/src/schema.ts mirrors the attribute; keep the two in step.
export const CustomParagraphStyle = Extension.create({
  name: 'customParagraphStyle',

  addGlobalAttributes() {
    return [{
      types: ['paragraph'],
      attributes: {
        styleProps: {
          default: null,
          parseHTML: (element: HTMLElement) => parseSnapshot(element.getAttribute('data-style-props')),
          renderHTML: (attributes: { style?: unknown; styleProps?: unknown }) => customStyleHtmlAttributes(attributes.style, attributes.styleProps),
        },
      },
    }]
  },
})
