import { useEffect, useMemo, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { useDocumentParagraphStyles, useParagraphStyles } from '@/api/paragraphStyles'
import { customStyleIdsIn, mergeStyles, type CustomParagraphStyle } from '@/data/customParagraphStyle'

const NONE: CustomParagraphStyle[] = []
// A burst of typing reads the document once, not on every key.
const READ_DELAY_MS = 300

// Gives an open document's editor the definitions of the custom styles its
// paragraphs refer to: the person's own, and those of whoever else made the ones
// the document uses (asked of the server for this document). The editor draws a
// paragraph in a style it knows and leaves any other plain. Returns the styles.
export function useDocumentCustomStyles(editor: Editor | null, documentId: number): CustomParagraphStyle[] {
  const { data: own = NONE } = useParagraphStyles()
  const [used, setUsed] = useState<number[]>([])
  const { data: looked = NONE } = useDocumentParagraphStyles(documentId, used, own.map((style) => style.id))
  const styles = useMemo(() => mergeStyles(looked, own), [looked, own])

  // Which styles the document refers to, now and as it changes.
  useEffect(() => {
    if (!editor) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const read = () => {
      const ids = customStyleIdsIn(editor.getJSON())
      setUsed((previous) => (previous.length === ids.length && previous.every((id, i) => id === ids[i]) ? previous : ids))
    }
    const onUpdate = () => {
      clearTimeout(timer)
      timer = setTimeout(read, READ_DELAY_MS)
    }
    read()
    editor.on('update', onUpdate)
    return () => {
      clearTimeout(timer)
      editor.off('update', onUpdate)
    }
  }, [editor])

  useEffect(() => {
    editor?.commands.setCustomStyles(styles)
  }, [editor, styles])

  return styles
}
