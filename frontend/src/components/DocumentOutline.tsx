import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Button } from '@/components/ui'
import { activeHeadingIndex, type OutlineHeading } from '@/data/document'
import './DocumentOutline.scss'

function readHeadings(editor: Editor): OutlineHeading[] {
  const headings: OutlineHeading[] = []
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') headings.push({ level: node.attrs.level as number, text: node.textContent.trim() || 'Untitled', pos })
  })
  return headings
}

// A slim outline of the document's headings at the side: it marks the heading the
// cursor is under and jumps to one on click. Narrow, it shows only tick marks.
export default function DocumentOutline({ editor }: { editor: Editor }) {
  const [headings, setHeadings] = useState<OutlineHeading[]>(() => readHeadings(editor))
  const [cursor, setCursor] = useState(editor.state.selection.from)

  useEffect(() => {
    const refresh = () => { setHeadings(readHeadings(editor)); setCursor(editor.state.selection.from) }
    refresh()
    editor.on('update', refresh)
    editor.on('selectionUpdate', refresh)
    return () => { editor.off('update', refresh); editor.off('selectionUpdate', refresh) }
  }, [editor])

  // The title heading alone is not an outline.
  if (headings.length < 2) return null
  const active = activeHeadingIndex(headings, cursor)

  function jump(heading: OutlineHeading) {
    editor.chain().focus().setTextSelection(heading.pos + 1).run()
    const dom = editor.view.nodeDOM(heading.pos)
    if (dom instanceof HTMLElement) dom.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  return (
    <nav className="ui-outline" aria-label="Document outline">
      <ul className="ui-outline-list">
        {headings.map((heading, i) => (
          <li key={`${heading.pos}`}>
            <Button
              variant="unstyled"
              className={`ui-outline-item ui-outline-item--level_${Math.min(heading.level, 4)}${i === active ? ' ui-outline-item--active' : ''}`}
              aria-current={i === active ? 'location' : undefined}
              title={heading.text}
              onClick={() => jump(heading)}
            >
              <span className="ui-outline-tick" aria-hidden="true" />
              <span className="ui-outline-text">{heading.text}</span>
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
