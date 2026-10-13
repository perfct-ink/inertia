import { twMerge } from 'tailwind-merge'

export function FormError({ message, className }: { message: string | null | undefined; className?: string }) {
  return message ? <p role="alert" className={twMerge('text-sm text-red-500', className)}>{message}</p> : null
}
