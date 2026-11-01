import '@testing-library/jest-dom'
import { render } from '@testing-library/react'
import { StatusDot } from './StatusDot'

test('shows the status color as a decorative dot', () => {
  const { container } = render(<StatusDot color="orange" title="Doing" className="extra" />)
  const dot = container.firstElementChild!
  expect(dot).toHaveClass('ui-status_dot', 'ui-status_dot--orange', 'extra')
  expect(dot).toHaveAttribute('aria-hidden', 'true')
  expect(dot).toHaveAttribute('title', 'Doing')
})
