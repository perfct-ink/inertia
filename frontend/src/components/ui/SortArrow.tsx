import { ArrowDown, ArrowUp } from 'lucide-react'
import { classNames } from './classNames'
import './SortArrow.scss'

export type SortDirection = 'asc' | 'desc'

// The arrow beside the label of the column a table is sorted by: up for
// ascending, down for descending. Decorative; the header says it with aria-sort.
export function SortArrow({ direction, className }: { direction: SortDirection; className?: string }) {
  const Arrow = direction === 'asc' ? ArrowUp : ArrowDown
  return <Arrow aria-hidden="true" className={classNames('ui-sort_arrow', className)} />
}
