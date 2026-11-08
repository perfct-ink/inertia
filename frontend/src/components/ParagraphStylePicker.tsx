import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Select } from '@/components/ui'
import CustomStyleDialog from '@/components/CustomStyleDialog'
import { useParagraphStyles } from '@/api/paragraphStyles'
import { PARAGRAPH_STYLES, styleById, styleOfBlock, type ParagraphStyleId } from '@/data/paragraphStyle'
import {
  customStyleIdOfKey, customStyleKey, isStyleBase, mergeStyles,
  type CustomParagraphStyle, type StyleBase, type StyleProperties,
} from '@/data/customParagraphStyle'

// The option that opens the new-style form; it is a command, not a style.
const NEW_STYLE = 'new-style'

type BlockAttrs = { level?: number; style?: string | null }

// The style of the block the cursor is in: a built-in style's id, a custom
// style's key ("custom-<id>"), or '' for a block that has none.
function currentStyle(editor: Editor): string {
  const parent = editor.state.selection.$from.parent
  const attrs = parent.attrs as BlockAttrs
  if (parent.type.name === 'paragraph' && customStyleIdOfKey(attrs.style) !== null) return attrs.style as string
  return styleOfBlock(parent.type.name, attrs) ?? ''
}

// The custom styles the editor knows (the person's own and those the document uses).
function knownStyles(editor: Editor): CustomParagraphStyle[] {
  return [...(editor.storage.customParagraphStyle?.styles as Map<number, CustomParagraphStyle> | undefined)?.values() ?? []]
}

// What a new style starts from: the formatting of the paragraph the cursor is in.
function startingPoint(editor: Editor): { base: StyleBase; properties: StyleProperties } {
  const parent = editor.state.selection.$from.parent
  const id = parent.type.name === 'paragraph' ? customStyleIdOfKey((parent.attrs as BlockAttrs).style) : null
  const custom = id === null ? undefined : knownStyles(editor).find((style) => style.id === id)
  if (custom) return { base: custom.base, properties: custom.properties }
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

  // The paragraph refers to the style by its id; the editor draws it from the definition.
  function applyCustom(style: CustomParagraphStyle) {
    editor.commands.setCustomStyles(mergeStyles(knownStyles(editor), [style]))
    editor.chain().focus().setParagraph().updateAttributes('paragraph', { style: customStyleKey(style.id) }).run()
  }

  // Styles in this document made by someone else, which the person can also use here.
  const others = knownStyles(editor).filter((style) => !customStyles.some((own) => own.id === style.id))

  function choose(key: string) {
    if (key === NEW_STYLE) return setCreating(startingPoint(editor))
    const custom = [...customStyles, ...others].find((s) => customStyleKey(s.id) === key)
    if (custom) applyCustom(custom)
    else apply(key as ParagraphStyleId)
  }

  // A custom style the editor doesn't know (deleted, or not loaded yet) shows as "Style".
  const known = PARAGRAPH_STYLES.some((s) => s.id === value) || [...customStyles, ...others].some((s) => customStyleKey(s.id) === value)
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
        {others.length > 0 && (
          <optgroup label="In this document">
            {others.map((style) => <option key={style.id} value={customStyleKey(style.id)}>{style.name}</option>)}
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
