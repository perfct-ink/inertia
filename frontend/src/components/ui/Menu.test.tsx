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

describe('type-ahead and tab stops', () => {
  const many: MenuItem[] = [
    { key: 'a', label: 'Archive', onSelect: jest.fn() },
    { key: 'b', label: 'Billing', onSelect: jest.fn() },
    { key: 'c', label: 'Backups', onSelect: jest.fn() },
    { key: 'd', label: 'Delete', onSelect: jest.fn() },
  ]
  const openMany = () => {
    render(<Menu label="More" items={many}>More</Menu>)
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    return screen.getByRole('menu')
  }

  afterEach(() => jest.useRealTimers())

  test('typing a letter focuses the next item that starts with it, and again goes on to the one after', () => {
    const menu = openMany()
    fireEvent.keyDown(menu, { key: 'b' })
    expect(screen.getByRole('menuitem', { name: 'Billing' })).toHaveFocus()
    jest.useFakeTimers().setSystemTime(Date.now() + 1000)
    fireEvent.keyDown(menu, { key: 'b' })
    expect(screen.getByRole('menuitem', { name: 'Backups' })).toHaveFocus()
  })

  test('several quick letters narrow the match', () => {
    const menu = openMany()
    fireEvent.keyDown(menu, { key: 'b' })
    fireEvent.keyDown(menu, { key: 'a' })
    expect(screen.getByRole('menuitem', { name: 'Backups' })).toHaveFocus()
  })

  test('a letter that matches nothing leaves focus where it is', () => {
    const menu = openMany()
    const first = document.activeElement
    fireEvent.keyDown(menu, { key: 'z' })
    expect(document.activeElement).toBe(first)
  })

  test('only the focused item can be tabbed to; the items are not tab stops', () => {
    openMany()
    for (const item of screen.getAllByRole('menuitem')) expect(item).toHaveAttribute('tabindex', '-1')
  })

  test('Tab closes the menu', () => {
    const menu = openMany()
    fireEvent.keyDown(menu, { key: 'Tab' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})

describe('staying on the screen', () => {
  const rect = (r: Partial<DOMRect>) => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}), ...r }) as DOMRect
  let spy: jest.SpyInstance
  afterEach(() => spy?.mockRestore())

  function openWithRects(trigger: Partial<DOMRect>, list: Partial<DOMRect>) {
    spy = jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      return rect(this.getAttribute('role') === 'menu' ? list : trigger)
    })
    render(<Menu label="More" items={items}>More</Menu>)
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    return screen.getByRole('menu')
  }

  test('a list that would run off the right edge opens from the trigger\'s right edge', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true })
    const menu = openWithRects({ left: 300, right: 360, top: 10, bottom: 40 }, { left: 300, right: 524, width: 224, top: 44, bottom: 200, height: 156 })
    expect(menu).toHaveClass('ui-menu-list--end')
  })

  test('a list that fits is left alone', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
    const menu = openWithRects({ left: 20, right: 80, top: 10, bottom: 40 }, { left: 20, right: 244, width: 224, top: 44, bottom: 200, height: 156 })
    expect(menu).not.toHaveClass('ui-menu-list--end')
    expect(menu).not.toHaveClass('ui-menu-list--above')
  })

  test('a list that would run off the bottom opens above when there is room', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true })
    const menu = openWithRects({ left: 20, right: 80, top: 500, bottom: 530 }, { left: 20, right: 244, width: 224, top: 534, bottom: 700, height: 166 })
    expect(menu).toHaveClass('ui-menu-list--above')
  })

  test('with no room above either, it stays below', () => {
    Object.defineProperty(window, 'innerHeight', { value: 300, configurable: true })
    const menu = openWithRects({ left: 20, right: 80, top: 100, bottom: 130 }, { left: 20, right: 244, width: 224, top: 134, bottom: 400, height: 266 })
    expect(menu).not.toHaveClass('ui-menu-list--above')
  })
})
