import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from './Button'
import { Input } from './Input'
import { classNames } from './classNames'
import './Modal.scss'

type ModalProps = {
  open: boolean
  title: string
  description?: string
  // A roomy dialog for content such as a file preview (default: a small form-sized one).
  wide?: boolean
  onClose: () => void
  // Called before Esc closes the modal; call `event.preventDefault()` to keep it open
  // (a field that uses Esc to cancel what it is doing, such as recording a keystroke).
  onEscapeKeyDown?: (event: KeyboardEvent) => void
  // Contextual overrides, e.g. a wider dialog for a form with many fields.
  className?: string
  children?: ReactNode
}

// Where focus is while a popup of its own is open inside the modal: a date field with
// its calendar showing or a menu trigger (`aria-expanded`), or an item in an open menu.
const OPEN_POPUP = '[aria-expanded="true"], [role="menu"]'

// Radix closes the dialog on Esc in the capture phase on the document, before the
// calendar's or menu's own handler (which closes just that popup) can run. Leaving
// the dialog open for that keypress lets the popup close first; the next Esc closes the modal.
function keepOpenForPopup(event: KeyboardEvent) {
  if (document.activeElement?.closest(OPEN_POPUP)) event.preventDefault()
}

// Accessible modal (focus trap, Esc to close, aria labelling from Radix).
// Replaces native window.alert/confirm/prompt dialogs.
export function Modal({ open, title, description, wide, onClose, onEscapeKeyDown, className, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="ui-modal-overlay" />
        <Dialog.Content
          className={classNames('ui-modal-content', wide && 'ui-modal-content--wide', className)}
          onEscapeKeyDown={(event) => { onEscapeKeyDown?.(event); if (!event.defaultPrevented) keepOpenForPopup(event) }}
        >
          <Dialog.Title className="ui-modal-title">{title}</Dialog.Title>
          {description
            ? <Dialog.Description className="ui-modal-description">{description}</Dialog.Description>
            : <Dialog.Description className="ui-modal-description ui-modal-description--hidden">{title}</Dialog.Description>}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', destructive, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Modal open={open} title={title} description={description} onClose={onClose}>
      <div className="ui-modal-actions">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="button" variant={destructive ? 'destructive' : 'primary'} onClick={() => { onConfirm(); onClose() }}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

type PromptDialogProps = {
  open: boolean
  title: string
  label: string
  initialValue?: string
  placeholder?: string
  submitLabel?: string
  onSubmit: (value: string) => void
  onClose: () => void
}

export function PromptDialog({ open, title, label, initialValue = '', placeholder, submitLabel = 'Save', onSubmit, onClose }: PromptDialogProps) {
  const [value, setValue] = useState(initialValue)
  useEffect(() => { if (open) setValue(initialValue) }, [open, initialValue])

  function submit(e: FormEvent) {
    e.preventDefault()
    onSubmit(value.trim())
    onClose()
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form onSubmit={submit} className="ui-modal-form">
        <Input aria-label={label} value={value} placeholder={placeholder} autoFocus onChange={(e) => setValue(e.target.value)} />
        <div className="ui-modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">{submitLabel}</Button>
        </div>
      </form>
    </Modal>
  )
}
