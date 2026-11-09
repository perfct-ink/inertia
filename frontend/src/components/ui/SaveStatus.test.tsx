import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { SaveStatus } from './SaveStatus'

test('draws nothing visible once saved, and says so to screen readers', () => {
  const { container } = render(<SaveStatus state="saved" className="extra" />)
  const status = screen.getByRole('status')
  expect(status).toHaveClass('ui-save_status', 'extra')
  expect(status).toHaveTextContent('All changes saved')
  expect(container.querySelector('.ui-save_status-spinner')).toBeNull()
  expect(container.querySelector('.ui-save_status-dot')).toBeNull()
})

test('shows a spinner while saving', () => {
  const { container } = render(<SaveStatus state="saving" />)
  expect(screen.getByRole('status')).toHaveTextContent('Saving…')
  expect(container.querySelector('.ui-save_status-spinner')).toHaveAttribute('aria-hidden', 'true')
  expect(container.querySelector('.ui-save_status-dot')).toBeNull()
})

test('shows a dot while changes are not saved yet', () => {
  const { container } = render(<SaveStatus state="unsaved" />)
  expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes')
  expect(container.querySelector('.ui-save_status-dot')).toHaveAttribute('aria-hidden', 'true')
  expect(container.querySelector('.ui-save_status-spinner')).toBeNull()
})
