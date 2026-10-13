import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { classNames } from './classNames'
import './Textarea.scss'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props }, ref
) {
  return <textarea {...props} ref={ref} className={classNames('ui-textarea', className)} />
})
