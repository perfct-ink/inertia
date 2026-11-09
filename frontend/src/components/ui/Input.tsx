import { forwardRef, type InputHTMLAttributes } from 'react'
import { classNames } from './classNames'
import './Input.scss'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  // `underline`: a compact field drawn as a line, for dates and pickers inside cards.
  variant?: 'underline'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = 'text', variant, ...props }, ref
) {
  const checkable = type === 'checkbox' || type === 'radio'
  return <input {...props} ref={ref} type={type} className={classNames('ui-input', checkable && 'ui-input--checkable', variant && `ui-input--${variant}`, className)} />
})
