import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
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
  // Contextual overrides, e.g. a wider dialog for a form with many fields.
  className?: string
  children?: ReactNode
}

// Accessible modal (focus trap, Esc to close, aria labelling from Radix).
// Replaces native window.alert/confirm/prompt dialogs.
export function Modal({ open, title, description, wide, onClose, className, children }: ModalProps) {
  // Radix returns focus only to a Dialog.Trigger, and a Modal is opened by state, so
  // remember what had focus when it opened and give it back when it closes.
  const opener = useRef<HTMLElement | null>(null)
  useLayoutEffect(() => {
    if (open) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
  }, [open])

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="ui-modal-overlay" />
        <Dialog.Content
          className={classNames('ui-modal-content', wide && 'ui-modal-content--wide', className)}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (opener.current?.isConnected) opener.current.focus()
          }}
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
