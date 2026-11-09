import { forwardRef, type ButtonHTMLAttributes, type ReactNode, type ThHTMLAttributes } from 'react'
import { Button } from './Button'
import { SortArrow, type SortDirection } from './SortArrow'
import { classNames } from './classNames'
import './SortHeader.scss'

type SortButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  // The column's name.
  children: ReactNode
  // The way this column is sorted, or null while another column is the sorted one.
  direction: SortDirection | null
}

// The button in a column header that sorts by that column: its name, then an
// arrow on the column the list is sorted by. Use it directly for headers that
// are not table cells (a grid of rows); SortHeader wraps it for a <table>.
export const SortButton = forwardRef<HTMLButtonElement, SortButtonProps>(function SortButton(
  { direction, className, children, ...props }, ref
) {
  return (
    <Button
      type="button"
      {...props}
      ref={ref}
      className={classNames('ui-sort_button', direction && 'ui-sort_button--active', className)}
    >
      {children}
      {direction && <SortArrow direction={direction} />}
    </Button>
  )
})

type SortHeaderProps = Omit<ThHTMLAttributes<HTMLTableCellElement>, 'children' | 'onClick'> & {
  children: ReactNode
  direction: SortDirection | null
  // Called when the header is pressed; the caller flips or changes the sort.
  onSort: () => void
}

// A sortable column header of a <table>: a <th scope="col"> that says how it is
// sorted (aria-sort) and holds the SortButton.
export const SortHeader = forwardRef<HTMLTableCellElement, SortHeaderProps>(function SortHeader(
  { direction, onSort, children, ...props }, ref
) {
  const sort = direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'
  return (
    <th scope="col" {...props} ref={ref} aria-sort={sort}>
      <SortButton direction={direction} onClick={onSort}>{children}</SortButton>
    </th>
  )
})
