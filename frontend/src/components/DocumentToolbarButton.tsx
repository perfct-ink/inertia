import type { ReactNode } from 'react'
import { Button } from '@/components/ui'

// One icon button of the document toolbar (styles: view/document/DocumentScreen.scss).
// The title is both the tooltip and the accessible name; `active` shows it pressed.
export default function DocumentToolbarButton({
  icon,
  onClick,
  active,
  disabled,
  title,
}: {
  icon: ReactNode
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
}) {
  return (
    <Button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`document-toolbar_button ${active ? 'document-toolbar_button--active' : ''}`}
    >
      {icon}
    </Button>
  )
}
