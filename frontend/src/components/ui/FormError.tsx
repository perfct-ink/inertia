import { classNames } from './classNames'
import './FormError.scss'

export function FormError({ message, className }: { message: string | null | undefined; className?: string }) {
  return message ? <p role="alert" className={classNames('ui-form_error', className)}>{message}</p> : null
}
