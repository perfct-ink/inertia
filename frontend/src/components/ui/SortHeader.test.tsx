import '@testing-library/jest-dom'
import { createRef, type ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { SortButton, SortHeader } from './SortHeader'

function table(header: ReactNode) {
  return render(<table><thead><tr>{header}</tr></thead></table>)
}

test('a header says how it is sorted and sorts when pressed', () => {
  const onSort = jest.fn()
  table(<SortHeader direction="asc" onSort={onSort} className="extra">Name</SortHeader>)
  const header = screen.getByRole('columnheader', { name: 'Name' })
  expect(header).toHaveAttribute('aria-sort', 'ascending')
  expect(header).toHaveAttribute('scope', 'col')
  expect(header).toHaveClass('extra')
  fireEvent.click(screen.getByRole('button', { name: 'Name' }))
  expect(onSort).toHaveBeenCalledTimes(1)
})

test('a descending header says so and an unsorted one has no arrow', () => {
  const { container } = table(<><SortHeader direction="desc" onSort={() => {}}>Due</SortHeader><SortHeader direction={null} onSort={() => {}}>Owner</SortHeader></>)
  expect(screen.getByRole('columnheader', { name: 'Due' })).toHaveAttribute('aria-sort', 'descending')
  expect(screen.getByRole('columnheader', { name: 'Owner' })).toHaveAttribute('aria-sort', 'none')
  expect(container.querySelectorAll('.ui-sort_arrow')).toHaveLength(1)
})

test('the button keeps native props and its ref, and marks the sorted column', () => {
  const ref = createRef<HTMLButtonElement>()
  render(<SortButton ref={ref} direction="desc" title="Sort by date" disabled>Last modified</SortButton>)
  const button = screen.getByRole('button', { name: 'Last modified' })
  expect(ref.current).toBe(button)
  expect(button).toHaveAttribute('title', 'Sort by date')
  expect(button).toHaveAttribute('type', 'button')
  expect(button).toBeDisabled()
  expect(button).toHaveClass('ui-sort_button', 'ui-sort_button--active')
})
