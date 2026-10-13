import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

const variants = {
  unstyled: '',
  primary: 'min-h-10 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90',
  secondary: 'min-h-10 rounded-md border bg-card px-3 py-2 text-sm font-medium hover:bg-accent',
  ghost: 'rounded-md px-2 py-1 text-sm hover:bg-accent',
  destructive: 'min-h-10 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'unstyled', className, ...props }, ref
) {
  return <button {...props} ref={ref} className={twMerge(
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
    variants[variant], className
  )} />
})
