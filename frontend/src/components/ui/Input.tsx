import { forwardRef, type InputHTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, type = 'text', ...props }, ref
) {
  const checkable = type === 'checkbox' || type === 'radio'
  return <input {...props} ref={ref} type={type} className={twMerge(
    checkable
      ? 'accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
      : 'min-h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-50',
    className
  )} />
})
