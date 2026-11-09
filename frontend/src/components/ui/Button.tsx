import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes } from 'react'
import { classNames } from './classNames'
import './Button.scss'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'unstyled' | 'primary' | 'secondary' | 'ghost' | 'destructive' | 'muted'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'unstyled', className, ...props }, ref
) {
  return <button {...props} ref={ref} className={classNames('ui-button', `ui-button--${variant}`, className)} />
})

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: ButtonProps['variant'] }

// A real link (a download, "open in a new tab") that looks like a Button.
export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant = 'secondary', className, ...props }, ref
) {
  return <a {...props} ref={ref} className={classNames('ui-button', `ui-button--${variant}`, 'ui-button-link', className)} />
})
