import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { classNames } from './classNames'
import './Textarea.scss'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  // `underline`: a compact field drawn as a line, for notes inside cards.
  variant?: 'underline'
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, variant, ...props }, ref
) {
  return <textarea {...props} ref={ref} className={classNames('ui-textarea', variant && `ui-textarea--${variant}`, className)} />
})
