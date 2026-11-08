import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { customStyleIdOfKey, styleDecoration, type CustomParagraphStyle as CustomStyle } from '@/data/customParagraphStyle'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customParagraphStyle: {
      // Tells the editor which custom styles exist, so paragraphs that refer to them are drawn in them.
      setCustomStyles: (styles: CustomStyle[]) => ReturnType
    }
  }
}

const refreshed = new PluginKey('customParagraphStyle')

// Draws a paragraph that refers to a custom style (its `style` attribute,
// "custom-<id>", in StyledParagraph) in that style. The document stores only the
// reference; the definitions arrive from the server through setCustomStyles
// (DocumentScreen), so editing a style restyles every paragraph that uses it. The
// look is added as a node decoration, from the sanitized definition
// (data/customParagraphStyle.ts), and a paragraph whose style isn't known is left
// plain. The decoration is not part of the document, so it is never saved or synced.
export const CustomParagraphStyle = Extension.create({
  name: 'customParagraphStyle',

  addStorage() {
    return { styles: new Map<number, CustomStyle>() }
  },

  addCommands() {
    return {
      setCustomStyles: (styles) => ({ tr, dispatch }) => {
        this.storage.styles = new Map(styles.map((style) => [style.id, style]))
        // A transaction that changes nothing, so the view asks for the decorations again.
        if (dispatch) dispatch(tr.setMeta(refreshed, true))
        return true
      },
    }
  },

  addProseMirrorPlugins() {
    const storage = this.storage as { styles: Map<number, CustomStyle> }
    return [
      new Plugin({
        key: refreshed,
        props: {
          decorations(state) {
            if (storage.styles.size === 0) return DecorationSet.empty
            const decorations: Decoration[] = []
            state.doc.descendants((node, pos) => {
              if (node.type.name !== 'paragraph') return node.isBlock
              const id = customStyleIdOfKey(node.attrs.style)
              const style = id === null ? undefined : storage.styles.get(id)
              if (style) decorations.push(Decoration.node(pos, pos + node.nodeSize, styleDecoration(style)))
              return false
            })
            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
