import { classNames } from './classNames'
import './FormError.scss'

// An error message. Give it an `id` and point the field's `aria-describedby` at it
// (the Field wrapper does both) so a screen reader hears it on returning to the field.
export function FormError({ message, className, id }: { message: string | null | undefined; className?: string; id?: string }) {
  return message ? <p id={id} role="alert" className={classNames('ui-form_error', className)}>{message}</p> : null
}
