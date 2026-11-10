import '@testing-library/jest-dom'
import { useState } from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { DatePicker } from './DatePicker'
import { Menu } from './Menu'
import { Modal } from './Modal'
import { Select } from './Select'

// The keyboard paths of the shared popups, against the real Radix dialog and popover.

// Radix attaches its outside-click listener and returns focus on the next tick.
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)) })

function Fruit({ onChange = jest.fn() }: { onChange?: (value: string) => void }) {
  return (
    <>
      <Select aria-label="Fruit" defaultValue="apple" onChange={(e) => onChange(e.target.value)}>
        <option value="apple">Apple</option>
        <option value="avocado">Avocado</option>
        <option value="banana">Banana</option>
        <option value="cherry" disabled>Cherry</option>
        <option value="date">Date</option>
      </Select>
      <button>outside</button>
    </>
  )
}
const fruit = () => screen.getByRole('combobox', { name: 'Fruit' })
const list = () => screen.getByRole('listbox')
const active = () => fruit().getAttribute('aria-activedescendant')
const optionId = (name: string) => within(list()).getByRole('option', { name }).id

describe('Select', () => {
  test('Home and End jump to the first and last enabled option', () => {
    render(<Fruit />)
    fireEvent.keyDown(fruit(), { key: 'ArrowDown' })
    fireEvent.keyDown(fruit(), { key: 'End' })
    expect(active()).toBe(optionId('Date'))
    fireEvent.keyDown(fruit(), { key: 'Home' })
    expect(active()).toBe(optionId('Apple'))
  })

  test('typing letters jumps to a matching option and skips disabled ones', () => {
    // Letters typed within 500ms of each other extend the search; spread the two searches apart.
    const now = jest.spyOn(Date, 'now')
    now.mockReturnValue(1000)
    render(<Fruit />)
    fireEvent.keyDown(fruit(), { key: 'ArrowDown' })
    fireEvent.keyDown(fruit(), { key: 'b' })
    expect(active()).toBe(optionId('Banana'))
    fireEvent.keyDown(fruit(), { key: 'c' })
    expect(active()).toBe(optionId('Banana'))
    // More letters in quick succession narrow the search.
    now.mockReturnValue(5000)
    fireEvent.keyDown(fruit(), { key: 'Home' })
    fireEvent.keyDown(fruit(), { key: 'a' })
    now.mockReturnValue(5100)
    fireEvent.keyDown(fruit(), { key: 'v' })
    expect(active()).toBe(optionId('Avocado'))
    now.mockRestore()
  })

  test('Escape closes the list and changes nothing', () => {
    const onChange = jest.fn()
    render(<Fruit onChange={onChange} />)
    fireEvent.keyDown(fruit(), { key: 'ArrowDown' })
    fireEvent.keyDown(fruit(), { key: 'ArrowDown' })
    fireEvent.keyDown(fruit(), { key: 'Escape' })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  test('Tab closes the list without choosing', () => {
    const onChange = jest.fn()
    render(<Fruit onChange={onChange} />)
    fireEvent.keyDown(fruit(), { key: 'ArrowDown' })
    fireEvent.keyDown(fruit(), { key: 'ArrowDown' })
    fireEvent.keyDown(fruit(), { key: 'Tab' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  test('a click outside closes the list', async () => {
    render(<Fruit />)
    fireEvent.keyDown(fruit(), { key: 'ArrowDown' })
    expect(list()).toBeInTheDocument()
    await settle()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'outside' }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

describe('Modal', () => {
  function Host({ onClose = jest.fn() }: { onClose?: () => void }) {
    const [open, setOpen] = useState(false)
    return (
      <>
        <button onClick={() => setOpen(true)}>Open it</button>
        <Modal open={open} title="Rename" onClose={() => { setOpen(false); onClose() }}>
          <input aria-label="Name" />
          <button>Save</button>
        </Modal>
      </>
    )
  }

  test('focus moves into the dialog when it opens and returns to the opener when it closes', async () => {
    render(<Host />)
    const opener = screen.getByRole('button', { name: 'Open it' })
    opener.focus()
    fireEvent.click(opener)
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(opener).toHaveFocus())
  })

  test('Escape closes it and calls onClose once', () => {
    const onClose = jest.fn()
    render(<Host onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open it' }))
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('a click on the overlay closes it', async () => {
    const onClose = jest.fn()
    render(<Host onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open it' }))
    await settle()
    fireEvent.pointerDown(document.querySelector('.ui-modal-overlay')!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('a click inside the dialog does not close it', async () => {
    const onClose = jest.fn()
    render(<Host onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open it' }))
    await settle()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Save' }))
    expect(onClose).not.toHaveBeenCalled()
  })

  test('focus is trapped: the dialog\'s controls sit between two focus guards, and the page behind is hidden from assistive technology', () => {
    render(<Host />)
    fireEvent.click(screen.getByRole('button', { name: 'Open it' }))
    expect(screen.getByRole('button', { name: 'Open it', hidden: true })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open it' })).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-radix-focus-guard]').length).toBeGreaterThanOrEqual(2)
  })
})

describe('Menu', () => {
  test('Tab closes the menu', () => {
    render(<Menu label="More" items={[{ key: 'a', label: 'Archive', onSelect: jest.fn() }]}>More</Menu>)
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})

describe('DatePicker', () => {
  function Day({ initial = '2026-11-10' }: { initial?: string }) {
    const [value, setValue] = useState(initial)
    return <DatePicker aria-label="Due" value={value} onChange={(e) => setValue(e.target.value)} />
  }
  const field = () => screen.getByRole('combobox', { name: 'Due' })

  test('Shift+PageDown and Shift+PageUp move the highlighted day by a year', () => {
    render(<Day />)
    fireEvent.click(field())
    fireEvent.keyDown(field(), { key: 'PageDown', shiftKey: true })
    expect(field().getAttribute('aria-activedescendant')).toMatch(/2027-11-10$/)
    fireEvent.keyDown(field(), { key: 'PageUp', shiftKey: true })
    fireEvent.keyDown(field(), { key: 'PageUp', shiftKey: true })
    expect(field().getAttribute('aria-activedescendant')).toMatch(/2025-11-10$/)
  })

  test('PageDown and PageUp move a month', () => {
    render(<Day />)
    fireEvent.click(field())
    fireEvent.keyDown(field(), { key: 'PageDown' })
    expect(field().getAttribute('aria-activedescendant')).toMatch(/2026-12-10$/)
    fireEvent.keyDown(field(), { key: 'PageUp' })
    expect(field().getAttribute('aria-activedescendant')).toMatch(/2026-11-10$/)
  })
})
