import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { classNames } from './classNames'
import './Button.scss'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'unstyled' | 'primary' | 'secondary' | 'ghost' | 'destructive'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'unstyled', className, ...props }, ref
) {
  return <button {...props} ref={ref} className={classNames('ui-button', `ui-button--${variant}`, className)} />
})
