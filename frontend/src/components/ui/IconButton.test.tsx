import '@testing-library/jest-dom'
import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { Button } from './Button'
import { IconButton } from './IconButton'

test('an icon button is named by its label and keeps native button props and ref', () => {
  const ref = createRef<HTMLButtonElement>()
  const click = jest.fn()
  render(<IconButton ref={ref} label="Close" title="Close it" className="extra" onClick={click}><svg /></IconButton>)
  const button = screen.getByRole('button', { name: 'Close' })
  expect(ref.current).toBe(button)
  expect(button).toHaveAttribute('title', 'Close it')
  expect(button).toHaveClass('ui-button', 'ui-button--muted', 'ui-icon_button', 'extra')
  expect(button).not.toHaveClass('ui-icon_button--danger')
  fireEvent.click(button)
  expect(click).toHaveBeenCalledTimes(1)
})

test('the danger tone adds the red-on-hover class and a disabled one does not click', () => {
  const click = jest.fn()
  render(<IconButton label="Delete task" tone="danger" disabled onClick={click}><svg /></IconButton>)
  const button = screen.getByRole('button', { name: 'Delete task' })
  expect(button).toHaveClass('ui-icon_button', 'ui-icon_button--danger')
  expect(button).toBeDisabled()
  fireEvent.click(button)
  expect(click).not.toHaveBeenCalled()
})

test('fill adds the hover box class and is off by default', () => {
  render(<><IconButton label="Add" fill><svg /></IconButton><IconButton label="Plain"><svg /></IconButton></>)
  expect(screen.getByRole('button', { name: 'Add' })).toHaveClass('ui-icon_button--fill')
  expect(screen.getByRole('button', { name: 'Plain' })).not.toHaveClass('ui-icon_button--fill')
})

test('the muted button variant is a plain text button in muted colors', () => {
  render(<Button variant="muted">Clear</Button>)
  expect(screen.getByRole('button', { name: 'Clear' })).toHaveClass('ui-button', 'ui-button--muted')
})
