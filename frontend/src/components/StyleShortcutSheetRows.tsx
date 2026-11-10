import { Button } from '@/components/ui'
import { useParagraphStyleShortcuts } from '@/api/paragraphStyleShortcuts'
import { useParagraphStyles } from '@/api/paragraphStyles'
import { customStyleKey } from '@/data/customParagraphStyle'
import { PARAGRAPH_STYLES } from '@/data/paragraphStyle'
import { chordLabel } from '@/data/paragraphStyleShortcut'
import { isMac } from '@/util/platform'

// The keystrokes the person gave their paragraph styles, for the ⌘/ sheet's "In a
// document" list, and the way into the dialog that sets them. The rows reuse the
// sheet's own classes (Sidebar.scss).
export default function StyleShortcutSheetRows({ onEdit }: { onEdit: () => void }) {
  const { data: shortcuts = [] } = useParagraphStyleShortcuts()
  const { data: styles = [] } = useParagraphStyles()

  const labelOf = (style: string) => styles.find((s) => customStyleKey(s.id) === style)?.name ?? PARAGRAPH_STYLES.find((s) => s.id === style)?.label

  return (
    <>
      {shortcuts.flatMap(({ style, keys }) => {
        const label = labelOf(style)
        return label ? [(
          <div key={`mine-${style}`} className="sidebar-shortcut">
            <span>{label} style (yours)</span>
            <kbd className="sidebar-kbd">{chordLabel(keys, isMac)}</kbd>
          </div>
        )] : []
      })}
      <Button type="button" variant="ghost" className="sidebar-shortcuts_link" onClick={onEdit}>Set style shortcuts…</Button>
    </>
  )
}
