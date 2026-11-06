import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Select } from '@/components/ui'
import CustomStyleDialog from '@/components/CustomStyleDialog'
import { useParagraphStyles } from '@/api/paragraphStyles'
import { PARAGRAPH_STYLES, styleById, styleOfBlock, type ParagraphStyleId } from '@/data/paragraphStyle'
import {
  customStyleAttributes, customStyleIdOfKey, customStyleKey, isStyleBase, snapshotOfBlock,
  type CustomParagraphStyle, type StyleBase, type StyleProperties,
} from '@/data/customParagraphStyle'

// The option that opens the new-style form; it is a command, not a style.
const NEW_STYLE = 'new-style'

type BlockAttrs = { level?: number; style?: string | null; styleProps?: unknown }

// The style of the block the cursor is in: a built-in style's id, a custom
// style's key ("custom-<id>"), or '' for a block that has none.
function currentStyle(editor: Editor): string {
  const parent = editor.state.selection.$from.parent
  const attrs = parent.attrs as BlockAttrs
  if (parent.type.name === 'paragraph' && customStyleIdOfKey(attrs.style) !== null) return attrs.style as string
  return styleOfBlock(parent.type.name, attrs) ?? ''
}

// What a new style starts from: the formatting of the paragraph the cursor is in.
function startingPoint(editor: Editor): { base: StyleBase; properties: StyleProperties } {
  const parent = editor.state.selection.$from.parent
  const snapshot = snapshotOfBlock(parent.attrs as BlockAttrs)
  if (snapshot) {
    const { base, ...properties } = snapshot
    return { base, properties }
  }
  const builtIn = styleOfBlock(parent.type.name, parent.attrs as BlockAttrs)
  return { base: isStyleBase(builtIn) ? builtIn : 'body', properties: {} }
}

const NOT_CREATING = { base: 'body' as StyleBase, properties: {} }

// The toolbar's style menu: shows the style of the block the cursor is in and
// applies another to it (a heading level, a named paragraph style, or one of
// the person's own custom styles). "New style…" makes a custom style from the
// paragraph the cursor is in and applies it.
export default function ParagraphStylePicker({ editor }: { editor: Editor }) {
  const [value, setValue] = useState<string>(() => currentStyle(editor))
  const [creating, setCreating] = useState<ReturnType<typeof startingPoint> | null>(null)
  const { data: customStyles = [] } = useParagraphStyles()

  useEffect(() => {
    const refresh = () => setValue(currentStyle(editor))
    editor.on('selectionUpdate', refresh)
    editor.on('transaction', refresh)
    return () => { editor.off('selectionUpdate', refresh); editor.off('transaction', refresh) }
  }, [editor])

  function apply(id: ParagraphStyleId) {
    const style = styleById(id)
    const chain = editor.chain().focus()
    if (style.heading) chain.setHeading({ level: style.heading }).run()
    else chain.setParagraph().updateAttributes('paragraph', { style: style.paragraphStyle }).run()
  }

  function applyCustom(style: CustomParagraphStyle) {
    editor.chain().focus().setParagraph().updateAttributes('paragraph', customStyleAttributes(style)).run()
  }

  function choose(key: string) {
    if (key === NEW_STYLE) return setCreating(startingPoint(editor))
    const custom = customStyles.find((s) => customStyleKey(s.id) === key)
    if (custom) applyCustom(custom)
    else apply(key as ParagraphStyleId)
  }

  // A custom style this person doesn't have (someone else's, or one the list hasn't loaded) shows as "Style".
  const known = PARAGRAPH_STYLES.some((s) => s.id === value) || customStyles.some((s) => customStyleKey(s.id) === value)
  const shown = known ? value : ''

  return (
    <>
      <Select aria-label="Paragraph style" value={shown} onChange={(e) => choose(e.target.value)} className="document-toolbar_style">
        {shown === '' && <option value="">Style</option>}
        {PARAGRAPH_STYLES.map((style) => <option key={style.id} value={style.id}>{style.label}</option>)}
        {customStyles.length > 0 && (
          <optgroup label="My styles">
            {customStyles.map((style) => <option key={style.id} value={customStyleKey(style.id)}>{style.name}</option>)}
          </optgroup>
        )}
        <option value={NEW_STYLE}>New style…</option>
      </Select>
      <CustomStyleDialog
        open={creating !== null}
        initial={creating ?? NOT_CREATING}
        styles={customStyles}
        onCreated={(style) => { applyCustom(style); setCreating(null) }}
        onClose={() => setCreating(null)}
      />
    </>
  )
}
