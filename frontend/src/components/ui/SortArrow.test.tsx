import '@testing-library/jest-dom'
import { render } from '@testing-library/react'
import { SortArrow } from './SortArrow'

test('the arrow is a small decorative icon that differs for ascending and descending', () => {
  const { container: up } = render(<SortArrow direction="asc" className="extra" />)
  const { container: down } = render(<SortArrow direction="desc" />)
  const asc = up.querySelector('svg')
  expect(asc).toHaveClass('ui-sort_arrow', 'extra')
  expect(asc).toHaveAttribute('aria-hidden', 'true')
  expect(down.querySelector('svg')).toHaveClass('ui-sort_arrow')
  expect(up.innerHTML).not.toEqual(down.innerHTML)
})
