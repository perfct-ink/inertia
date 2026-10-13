import { forwardRef, type SelectHTMLAttributes } from 'react'
import { classNames } from './classNames'
import './Select.scss'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...props }, ref
) {
  return <select {...props} ref={ref} className={classNames('ui-select', className)} />
})
