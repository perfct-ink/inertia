import { Children, cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'
import { FormError } from './FormError'
import { classNames } from './classNames'
import './Field.scss'

type ControlProps = { id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean | 'true' | 'false' }

interface FieldProps {
  label: ReactNode
  // Help text under the label, read with the field.
  hint?: ReactNode
  // Shows "(optional)" after the label.
  optional?: boolean
  // The error for this field. It shows below the control, and the control is marked
  // invalid and described by it.
  error?: string | null
  className?: string
  // The one control: an Input, Textarea, Select or DatePicker.
  children: ReactElement<ControlProps>
}

// A labelled field: the label, a hint, the control and its error, wired together
// the way Volta's Field is. It gives the control an id (its own if it has one) for the
// label's `htmlFor`, `aria-describedby` for the hint and error (after any the control
// already has) and `aria-invalid` while there is an error. The control keeps all its
// other props and its ref.
export function Field({ label, hint, optional, error, className, children }: FieldProps) {
  const generated = useId()
  const control = Children.only(children)
  if (!isValidElement<ControlProps>(control)) return null
  const id = control.props.id ?? generated
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [control.props['aria-describedby'], hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className={classNames('ui-field', className)}>
      <label htmlFor={id} className="ui-field-label">
        {label}
        {optional && <span className="ui-field-optional"> (optional)</span>}
      </label>
      {hint && <p id={hintId} className="ui-field-hint">{hint}</p>}
      {cloneElement(control, {
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : control.props['aria-invalid'],
      })}
      <FormError id={errorId} message={error} />
    </div>
  )
}
