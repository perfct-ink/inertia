import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Select } from '@/components/ui'
import { PARAGRAPH_STYLES, styleById, styleOfBlock, type ParagraphStyleId } from '@/data/paragraphStyle'

function currentStyle(editor: Editor): ParagraphStyleId | '' {
  const parent = editor.state.selection.$from.parent
  return styleOfBlock(parent.type.name, parent.attrs as { level?: number; style?: string | null }) ?? ''
}

// The toolbar's style menu: shows the style of the block the cursor is in and
// applies another to it (a heading level, or a named paragraph style).
export default function ParagraphStylePicker({ editor }: { editor: Editor }) {
  const [value, setValue] = useState<ParagraphStyleId | ''>(() => currentStyle(editor))

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

  return (
    <Select aria-label="Paragraph style" value={value} onChange={(e) => apply(e.target.value as ParagraphStyleId)} className="document-toolbar_style">
      {value === '' && <option value="">Style</option>}
      {PARAGRAPH_STYLES.map((style) => <option key={style.id} value={style.id}>{style.label}</option>)}
    </Select>
  )
}
