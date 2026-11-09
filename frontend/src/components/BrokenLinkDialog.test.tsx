import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import BrokenLinkDialog from './BrokenLinkDialog'

const link = { from: 3, to: 14, text: 'Launch plan', href: '/documents/2#launch-plan', reason: 'heading' as const }

function renderDialog(props: Partial<React.ComponentProps<typeof BrokenLinkDialog>> = {}) {
  const handlers = { onPickTarget: jest.fn(), onRemove: jest.fn(), onClose: jest.fn() }
  render(<BrokenLinkDialog link={link} {...handlers} {...props} />)
  return handlers
}

test('says the heading is gone and shows the link text', () => {
  renderDialog()
  expect(screen.getByText('This link is broken')).toBeInTheDocument()
  expect(screen.getByText('The heading this link points to is no longer in its document.')).toBeInTheDocument()
  expect(screen.getByText('Launch plan')).toBeInTheDocument()
})

test('says the document is gone when it was deleted', () => {
  renderDialog({ link: { ...link, reason: 'document' } })
  expect(screen.getByText(/document this link points to was deleted/)).toBeInTheDocument()
})

test('offers a new target, removing the link, and cancelling', () => {
  const { onPickTarget, onRemove, onClose } = renderDialog()
  fireEvent.click(screen.getByRole('button', { name: 'Pick a new target' }))
  expect(onPickTarget).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Remove link' }))
  expect(onRemove).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('cancel is the first button, so Enter on open changes nothing', () => {
  renderDialog()
  expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Cancel', 'Remove link', 'Pick a new target'])
})

test('renders nothing while there is no broken link', () => {
  renderDialog({ link: null })
  expect(screen.queryByText('This link is broken')).not.toBeInTheDocument()
})
