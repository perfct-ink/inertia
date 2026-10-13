import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props }, ref
) {
  return <textarea {...props} ref={ref} className={twMerge(
    'min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-50',
    className
  )} />
})
