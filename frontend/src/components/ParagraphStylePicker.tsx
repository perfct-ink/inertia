import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Select } from '@/components/ui'
import CustomStyleDialog from '@/components/CustomStyleDialog'
import CustomStylesDialog from '@/components/CustomStylesDialog'
import StyleShortcutsDialog from '@/components/StyleShortcutsDialog'
import { useParagraphStyles } from '@/api/paragraphStyles'
import { useParagraphStyleShortcuts } from '@/api/paragraphStyleShortcuts'
import { useAuthStore } from '@/store/auth'
import { PARAGRAPH_STYLES, styleOfBlock, type ParagraphStyleId } from '@/data/paragraphStyle'
import {
  customStyleIdOfKey, customStyleKey, readSnapshot, startingFormat,
  type CustomParagraphStyle,
} from '@/data/customParagraphStyle'
import { applyCustomParagraphStyle } from '@/util/customParagraphStyleCommand'
import { applyParagraphStyle } from '@/util/paragraphStyleCommand'
import { chordLabel, shortcutOfStyle } from '@/data/paragraphStyleShortcut'
import { shortcutLabel } from '@/util/shortcuts'
import { isMac } from '@/util/platform'

// The options that open the style forms; they are commands, not styles.
const NEW_STYLE = 'new-style'
const MANAGE_STYLES = 'manage-styles'
const STYLE_SHORTCUTS = 'style-shortcuts'

type BlockAttrs = { level?: number; style?: string | null; styleName?: string | null; styleProps?: string | null }

function currentBlock(editor: Editor) {
  const parent = editor.state.selection.$from.parent
  return { type: parent.type.name, attrs: parent.attrs as BlockAttrs }
}

// The style of the block the cursor is in: a built-in style's id, a custom
// style's key ("custom-<id>"), or '' for a block that has none.
function currentStyle(editor: Editor): string {
  const { type, attrs } = currentBlock(editor)
  if (type === 'paragraph' && customStyleIdOfKey(attrs.style) !== null) return attrs.style as string
  return styleOfBlock(type, attrs) ?? ''
}

// The name a paragraph's copy of a custom style carries ("" when it has none).
function currentCopyName(editor: Editor): string {
  const { type, attrs } = currentBlock(editor)
  return type === 'paragraph' ? readSnapshot(attrs)?.name ?? '' : ''
}

// What a new style starts from: the formatting of the paragraph the cursor is in.
function startingPoint(editor: Editor) {
  const { type, attrs } = currentBlock(editor)
  return startingFormat(attrs, styleOfBlock(type, attrs))
}

const NOT_CREATING = { base: 'body' as const, properties: {} }

// The toolbar's style menu: shows the style of the block the cursor is in and
// applies another to it (a heading level, a named paragraph style, or one of
// the person's own custom styles). "New style…" makes a custom style from the
// paragraph the cursor is in and applies it; "Manage styles…" edits or deletes
// the person's styles; "Style shortcuts…" gives any style a keystroke. A paragraph keeps a copy of its custom style, so one made
// by someone else only shows here as the current style, never as a choice.
export default function ParagraphStylePicker({ editor }: { editor: Editor }) {
  const [value, setValue] = useState<string>(() => currentStyle(editor))
  const [copyName, setCopyName] = useState<string>(() => currentCopyName(editor))
  const [creating, setCreating] = useState<ReturnType<typeof startingPoint> | null>(null)
  const [editing, setEditing] = useState<CustomParagraphStyle | null>(null)
  const [managing, setManaging] = useState(false)
  const [assigningKeys, setAssigningKeys] = useState(false)
  const { data: customStyles = [] } = useParagraphStyles()
  const { data: myShortcuts = [] } = useParagraphStyleShortcuts()
  const userId = useAuthStore((s) => s.user?.id ?? null)

  useEffect(() => {
    const refresh = () => { setValue(currentStyle(editor)); setCopyName(currentCopyName(editor)) }
    editor.on('selectionUpdate', refresh)
    editor.on('transaction', refresh)
    return () => { editor.off('selectionUpdate', refresh); editor.off('transaction', refresh) }
  }, [editor])

  function choose(key: string) {
    if (key === NEW_STYLE) return setCreating(startingPoint(editor))
    if (key === MANAGE_STYLES) return setManaging(true)
    if (key === STYLE_SHORTCUTS) return setAssigningKeys(true)
    const custom = customStyles.find((style) => customStyleKey(style.id) === key)
    if (custom) applyCustomParagraphStyle(editor, custom, userId)
    else applyParagraphStyle(editor, key as ParagraphStyleId)
  }

  // A custom style the person doesn't have (someone else's, or deleted since) is
  // shown by the name its paragraph carries, but can't be chosen again.
  const isBuiltIn = PARAGRAPH_STYLES.some((s) => s.id === value)
  const isMine = customStyles.some((s) => customStyleKey(s.id) === value)
  const isTheirs = !isBuiltIn && !isMine && customStyleIdOfKey(value) !== null
  const shown = isBuiltIn || isMine || isTheirs ? value : ''

  return (
    <>
      <Select aria-label="Paragraph style" value={shown} onChange={(e) => choose(e.target.value)} className="document-toolbar_style">
        {shown === '' && <option value="">Style</option>}
        {isTheirs && <option value={value}>{copyName || 'Custom style'}</option>}
        {PARAGRAPH_STYLES.map((style) => {
          const mine = myShortcuts.find((s) => s.style === style.id)
          const keys = shortcutOfStyle(style.id)?.keys
          const hint = mine ? chordLabel(mine.keys, isMac) : keys && shortcutLabel(keys)
          return <option key={style.id} value={style.id} data-hint={hint}>{style.label}</option>
        })}
        {customStyles.length > 0 && (
          <optgroup label="My styles">
            {customStyles.map((style) => {
              const mine = myShortcuts.find((s) => s.style === customStyleKey(style.id))
              return <option key={style.id} value={customStyleKey(style.id)} data-hint={mine && chordLabel(mine.keys, isMac)}>{style.name}</option>
            })}
          </optgroup>
        )}
        <option value={NEW_STYLE}>New style…</option>
        {customStyles.length > 0 && <option value={MANAGE_STYLES}>Manage styles…</option>}
        <option value={STYLE_SHORTCUTS}>Style shortcuts…</option>
      </Select>
      <CustomStyleDialog
        open={creating !== null || editing !== null}
        editing={editing}
        initial={creating ?? NOT_CREATING}
        styles={customStyles}
        onSaved={(style) => {
          if (!editing) applyCustomParagraphStyle(editor, style, userId)
          setCreating(null)
          setEditing(null)
        }}
        onClose={() => { setCreating(null); setEditing(null) }}
      />
      <StyleShortcutsDialog open={assigningKeys} onClose={() => setAssigningKeys(false)} />
      <CustomStylesDialog
        open={managing}
        styles={customStyles}
        onEdit={(style) => { setManaging(false); setEditing(style) }}
        onClose={() => setManaging(false)}
      />
    </>
  )
}
