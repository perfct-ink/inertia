import { useState, type KeyboardEvent } from 'react'
import { Button, FormError, Modal } from '@/components/ui'
import {
  useClearParagraphStyleShortcut, useParagraphStyleShortcuts, useSetParagraphStyleShortcut,
} from '@/api/paragraphStyleShortcuts'
import { useParagraphStyles } from '@/api/paragraphStyles'
import { customStyleKey } from '@/data/customParagraphStyle'
import { PARAGRAPH_STYLES } from '@/data/paragraphStyle'
import { chordClash, chordLabel, chordOfEvent, shortcutOfStyle } from '@/data/paragraphStyleShortcut'
import { errorMessage } from '@/util/errorMessage'
import { isMac } from '@/util/platform'
import { platformKeys } from '@/util/keyLabel'
import './StyleShortcutsDialog.scss'

interface Props {
  open: boolean
  onClose: () => void
}

// The keystroke of every paragraph style, built-in or the person's own, to set,
// change or clear (paragraph-style-keystrokes). "Set" waits for the next chord with ⌘
// (Ctrl elsewhere) and saves it; a chord already on another of their styles is
// refused by the server and shown beside the row. A chord the editor already uses
// (⌘B, a toolbar key) is allowed, with a note that it takes over inside documents. A
// style's own default key (⌘⌥7 for Title) keeps working beside it. Saved to the account.
export default function StyleShortcutsDialog({ open, onClose }: Props) {
  const { data: shortcuts = [] } = useParagraphStyleShortcuts()
  const { data: customStyles = [] } = useParagraphStyles()
  const set = useSetParagraphStyleShortcut()
  const clear = useClearParagraphStyleShortcut()
  const [recording, setRecording] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ style: string; message: string } | null>(null)

  const rows = [
    ...PARAGRAPH_STYLES.map((style) => ({ key: style.id, label: style.label, fallback: shortcutOfStyle(style.id)?.keys })),
    ...customStyles.map((style) => ({ key: customStyleKey(style.id), label: style.name, fallback: undefined })),
  ]

  function record(style: string, e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'Escape') return // the dialog's Esc handler cancels the recording
    if (['Meta', 'Control', 'Alt', 'Shift', 'Tab'].includes(e.key)) return
    e.preventDefault()
    e.stopPropagation()
    const chord = chordOfEvent(e.nativeEvent, isMac)
    if (!chord) {
      setNotice({ style, message: `Press ${isMac ? '⌘' : 'Ctrl'} with a letter or digit.` })
      return
    }
    const taken = chordClash(chord, isMac)
    setRecording(null)
    set.mutate({ style, keys: chord }, {
      onSuccess: () => setNotice(taken ? { style, message: `${chordLabel(chord, isMac)} is ${taken} elsewhere in the editor; in a document your choice wins.` } : null),
      onError: (err) => setNotice({ style, message: errorMessage(err) }),
    })
  }

  return (
    <Modal
      open={open}
      title="Style shortcuts"
      description="Give a paragraph style a keystroke. Saved to your account, for every document you edit."
      onClose={onClose}
      // Esc while waiting for a chord cancels the recording, not the dialog.
      onEscapeKeyDown={(e) => { if (recording) { e.preventDefault(); setRecording(null) } }}
      className="style_shortcuts_dialog"
    >
      <ul className="style_shortcuts_dialog-list">
        {rows.map((row) => {
          const mine = shortcuts.find((s) => s.style === row.key)
          const active = recording === row.key
          const message = notice?.style === row.key ? notice.message : ''
          return (
            <li key={row.key} className="style_shortcuts_dialog-row">
              <span className="style_shortcuts_dialog-name">{row.label}</span>
              <kbd className="style_shortcuts_dialog-keys">
                {mine ? chordLabel(mine.keys, isMac) : row.fallback ? platformKeys(row.fallback, isMac) : '—'}
              </kbd>
              <Button
                type="button"
                variant="secondary"
                className="style_shortcuts_dialog-touch"
                aria-label={`Set shortcut for ${row.label}`}
                onClick={(e) => { setNotice(null); setRecording(active ? null : row.key); e.currentTarget.focus() }}
                onKeyDown={active ? (e) => record(row.key, e) : undefined}
                onBlur={() => { if (active) setRecording(null) }}
              >
                {active ? 'Press keys…' : 'Set'}
              </Button>
              {mine && (
                <Button
                  type="button"
                  variant="ghost"
                  className="style_shortcuts_dialog-touch"
                  aria-label={`Remove shortcut for ${row.label}`}
                  onClick={() => { setNotice(null); clear.mutate(row.key) }}
                >
                  Remove
                </Button>
              )}
              {message && <FormError message={message} className="style_shortcuts_dialog-message" />}
            </li>
          )
        })}
      </ul>
      <div className="ui-modal-actions">
        <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}
