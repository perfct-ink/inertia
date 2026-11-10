import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { ConfirmDialog, Modal, PromptDialog } from './Modal'
import { DatePicker } from './DatePicker'
import { Menu } from './Menu'

test('a closed modal renders nothing and an open one is a dialog named by its title', () => {
  const { rerender } = render(<Modal open={false} title="Invite" onClose={jest.fn()}>Body</Modal>)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  rerender(<Modal open title="Invite" description="Sends an email." onClose={jest.fn()}>Body</Modal>)
  const dialog = screen.getByRole('dialog', { name: 'Invite' })
  expect(within(dialog).getByText('Sends an email.')).toBeInTheDocument()
  expect(within(dialog).getByText('Body')).toBeInTheDocument()
})

test('a wide modal and a modal with a class name carry them on the content', () => {
  render(<Modal open title="Preview" wide className="custom" onClose={jest.fn()}>Body</Modal>)
  expect(screen.getByRole('dialog')).toHaveClass('ui-modal-content', 'ui-modal-content--wide', 'custom')
})

test('confirm runs onConfirm and closes; cancel only closes', () => {
  const onConfirm = jest.fn()
  const onClose = jest.fn()
  render(<ConfirmDialog open title="Publish?" confirmLabel="Publish" onConfirm={onConfirm} onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onConfirm).not.toHaveBeenCalled()
  expect(onClose).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }))
  expect(onConfirm).toHaveBeenCalledTimes(1)
  expect(onClose).toHaveBeenCalledTimes(2)
})

test('a destructive confirm draws the confirm button as destructive', () => {
  render(<ConfirmDialog open title="Delete?" confirmLabel="Delete" destructive onConfirm={jest.fn()} onClose={jest.fn()} />)
  expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('ui-button--destructive')
  expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('ui-button--secondary')
})

test('a prompt starts with its initial value and submits the trimmed text, then closes', () => {
  const onSubmit = jest.fn()
  const onClose = jest.fn()
  render(<PromptDialog open title="Rename" label="Name" initialValue="Old" submitLabel="Rename" onSubmit={onSubmit} onClose={onClose} />)
  const input = screen.getByRole('textbox', { name: 'Name' })
  expect(input).toHaveValue('Old')
  fireEvent.change(input, { target: { value: '  New name  ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Rename' }))
  expect(onSubmit).toHaveBeenCalledWith('New name')
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('cancelling a prompt submits nothing and reopening shows the initial value again', () => {
  const onSubmit = jest.fn()
  const { rerender } = render(<PromptDialog open title="Rename" label="Name" initialValue="Old" onSubmit={onSubmit} onClose={jest.fn()} />)
  fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Typed' } })
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onSubmit).not.toHaveBeenCalled()
  rerender(<PromptDialog open={false} title="Rename" label="Name" initialValue="Old" onSubmit={onSubmit} onClose={jest.fn()} />)
  rerender(<PromptDialog open title="Rename" label="Name" initialValue="Old" onSubmit={onSubmit} onClose={jest.fn()} />)
  expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Old')
})

describe('Escape inside a modal with an open popup', () => {
  function WithDate({ onClose }: { onClose: () => void }) {
    const [value, setValue] = useState('2026-11-02')
    return (
      <Modal open title="Task" onClose={onClose}>
        <DatePicker aria-label="Due date" value={value} onChange={(e) => setValue(e.target.value)} />
      </Modal>
    )
  }
  const field = () => screen.getByRole('combobox', { name: 'Due date' })

  test('the first Escape closes the calendar and leaves the modal (and what was typed) open; the second closes the modal', () => {
    const onClose = jest.fn()
    render(<WithDate onClose={onClose} />)
    fireEvent.click(field())
    expect(screen.getByRole('dialog', { name: 'Choose date' })).toBeInTheDocument()

    fireEvent.keyDown(field(), { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Choose date' })).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Task' })).toBeInTheDocument()

    fireEvent.keyDown(field(), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('the first Escape closes an open menu and leaves the modal open', () => {
    const onClose = jest.fn()
    render(
      <Modal open title="Task" onClose={onClose}>
        <Menu label="More" items={[{ key: 'a', label: 'Archive', onSelect: jest.fn() }]}>More</Menu>
      </Modal>,
    )
    const trigger = screen.getByRole('button', { name: 'More' })
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('with no popup open, Escape closes the modal at once', () => {
    const onClose = jest.fn()
    render(<WithDate onClose={onClose} />)
    fireEvent.keyDown(field(), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('onEscapeKeyDown can keep the modal open for its own reasons', () => {
    const onClose = jest.fn()
    render(<Modal open title="Task" onClose={onClose} onEscapeKeyDown={(e) => e.preventDefault()}>Body</Modal>)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
