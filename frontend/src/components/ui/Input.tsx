import { forwardRef, type InputHTMLAttributes } from 'react'
import { classNames } from './classNames'
import './Input.scss'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, type = 'text', ...props }, ref
) {
  const checkable = type === 'checkbox' || type === 'radio'
  return <input {...props} ref={ref} type={type} className={classNames('ui-input', checkable && 'ui-input--checkable', className)} />
})
