import { forwardRef, type SelectHTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...props }, ref
) {
  return <select {...props} ref={ref} className={twMerge(
    'min-h-10 rounded-md border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-50',
    className
  )} />
})
