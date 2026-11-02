import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Button } from './Button'
import { classNames } from './classNames'
import './IconButton.scss'

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  // What the button does. An icon has no text, so this is its accessible name.
  label: string
  // `danger` turns red on hover: delete, remove, discard.
  tone?: 'muted' | 'danger'
}

// A button that holds only an icon: muted until the pointer is over it, then
// full foreground, or red for tone="danger". Size, padding and any reveal-on-hover
// stay with the caller's class.
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, tone = 'muted', className, ...props }, ref
) {
  return (
    <Button
      {...props}
      ref={ref}
      variant="muted"
      aria-label={label}
      className={classNames('ui-icon_button', tone === 'danger' && 'ui-icon_button--danger', className)}
    />
  )
})
