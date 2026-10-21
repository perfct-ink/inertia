import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { Menu, type MenuItem } from './Menu'

const pick = jest.fn()
const items: MenuItem[] = [
  { key: 'a', label: 'Alpha', checked: false, onSelect: () => pick('a') },
  { key: 'b', label: 'Beta', checked: true, hint: 'owner', onSelect: () => pick('b') },
  { key: 'new', label: 'New...', separatorBefore: true, onSelect: () => pick('new') },
]

const open = () => {
  render(<><Menu label="Space: Alpha" items={items}>Alpha</Menu><button>outside</button></>)
  fireEvent.click(screen.getByRole('button', { name: 'Space: Alpha' }))
}

test('opens an anchored menu with a checked current choice that takes focus', () => {
  open()
  expect(screen.getByRole('menu', { name: 'Space: Alpha' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Space: Alpha' })).toHaveAttribute('aria-expanded', 'true')
  const beta = screen.getByRole('menuitemradio', { name: /Beta/ })
  expect(beta).toHaveAttribute('aria-checked', 'true')
  expect(screen.getByRole('menuitemradio', { name: 'Alpha' })).toHaveAttribute('aria-checked', 'false')
  expect(screen.getByRole('menuitem', { name: 'New...' })).toBeInTheDocument()
  expect(beta).toHaveFocus()
})

test('arrow keys, Home and End move between items and wrap', () => {
  open()
  const menu = screen.getByRole('menu')
  fireEvent.keyDown(menu, { key: 'ArrowDown' })
  expect(screen.getByRole('menuitem', { name: 'New...' })).toHaveFocus()
  fireEvent.keyDown(menu, { key: 'ArrowDown' })
  expect(screen.getByRole('menuitemradio', { name: 'Alpha' })).toHaveFocus()
  fireEvent.keyDown(menu, { key: 'ArrowUp' })
  expect(screen.getByRole('menuitem', { name: 'New...' })).toHaveFocus()
  fireEvent.keyDown(menu, { key: 'Home' })
  expect(screen.getByRole('menuitemradio', { name: 'Alpha' })).toHaveFocus()
  fireEvent.keyDown(menu, { key: 'End' })
  expect(screen.getByRole('menuitem', { name: 'New...' })).toHaveFocus()
})

test('choosing an item runs it, closes the menu and returns focus to the trigger', () => {
  open()
  fireEvent.click(screen.getByRole('menuitem', { name: 'New...' }))
  expect(pick).toHaveBeenCalledWith('new')
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Space: Alpha' })).toHaveFocus()
})

test('Escape and a click outside close it', () => {
  open()
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Space: Alpha' })).toHaveFocus()

  fireEvent.click(screen.getByRole('button', { name: 'Space: Alpha' }))
  fireEvent.mouseDown(screen.getByRole('button', { name: 'outside' }))
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})

test('ArrowDown on the closed trigger opens the menu', () => {
  render(<Menu label="Open" items={items}>Open</Menu>)
  const trigger = screen.getByRole('button', { name: 'Open' })
  trigger.focus()
  fireEvent.keyDown(trigger, { key: 'ArrowDown' })
  expect(screen.getByRole('menu')).toBeInTheDocument()
})
