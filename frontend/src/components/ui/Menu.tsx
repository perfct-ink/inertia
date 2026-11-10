import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { Button } from './Button'
import { classNames } from './classNames'
import './Menu.scss'

export interface MenuItem {
  key: string
  label: ReactNode
  onSelect: () => void
  // Set on items that pick one of several options: shown with a check when true.
  checked?: boolean
  // Small text after the label, such as a role.
  hint?: string
  icon?: ReactNode
  // Draws a divider above the item.
  separatorBefore?: boolean
}

interface MenuProps {
  // Accessible name of the trigger button and of the menu.
  label: string
  // The trigger's visible content.
  children: ReactNode
  items: MenuItem[]
  triggerClassName?: string
  // Opens the list above the trigger, for a menu at the bottom of the screen.
  above?: boolean
}

// How far the list keeps from the screen's edge when it has to move.
const EDGE_GAP = 8
// Typing within this long of the last letter extends the search, as in Select.
const TYPEAHEAD_MS = 500

// A dropdown menu anchored to its trigger. Arrow keys, Home and End move
// between items, typing a letter jumps to a matching item, Enter/Space choose
// one, Escape closes and gives focus back to the trigger, and a click outside
// closes it. Only the focused item is a tab stop (Tab leaves the menu). The
// list opens below the trigger's left edge and moves itself to the trigger's
// right edge, and above the trigger, when it would run off the screen.
export function Menu({ label, children, items, triggerClassName, above }: MenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const listRef = useRef<HTMLUListElement>(null)
  const typeahead = useRef({ text: '', at: 0 })
  // Where the open list had to move to stay on screen, measured as it opens.
  const [moved, setMoved] = useState({ end: false, above: false })

  useLayoutEffect(() => {
    if (!open) return setMoved({ end: false, above: false })
    const list = listRef.current?.getBoundingClientRect()
    const trigger = rootRef.current?.getBoundingClientRect()
    if (!list || !trigger) return
    setMoved({
      end: list.right > window.innerWidth - EDGE_GAP && trigger.right - list.width >= EDGE_GAP,
      above: list.bottom > window.innerHeight - EDGE_GAP && trigger.top - list.height >= EDGE_GAP,
    })
  }, [open])

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  const focusItem = (index: number) => {
    const buttons = rootRef.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]')
    if (buttons?.length) buttons[(index + buttons.length) % buttons.length].focus()
  }

  // On open, focus the checked item (the current choice), else the first.
  useEffect(() => {
    if (open) focusItem(Math.max(0, items.findIndex((i) => i.checked)))
    // Only when it opens, not every time the items change while open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open, close])

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (open) { e.preventDefault(); e.stopPropagation(); close(true) }
      return
    }
    const buttons = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]') ?? [])
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && document.activeElement === triggerRef.current) {
      e.preventDefault()
      setOpen(true)
    } else if (open && e.key === 'ArrowDown') { e.preventDefault(); focusItem(current + 1) }
    else if (open && e.key === 'ArrowUp') { e.preventDefault(); focusItem(current - 1) }
    else if (open && e.key === 'Home') { e.preventDefault(); focusItem(0) }
    else if (open && e.key === 'End') { e.preventDefault(); focusItem(buttons.length - 1) }
    else if (open && e.key === 'Tab') close(false)
    else if (open && e.key.length === 1 && e.key !== ' ' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      const now = Date.now()
      const text = (now - typeahead.current.at < TYPEAHEAD_MS ? typeahead.current.text : '') + e.key.toLowerCase()
      typeahead.current = { text, at: now }
      // The first match after the focused item (or at it, once more letters narrow the search).
      const start = current + (text.length > 1 ? 0 : 1)
      const order = buttons.map((_, i) => (start + i) % buttons.length)
      const match = order.find((i) => (buttons[i].textContent ?? '').trim().toLowerCase().startsWith(text))
      if (match !== undefined) buttons[match].focus()
    }
  }

  return (
    <div ref={rootRef} className="ui-menu" onKeyDown={onKeyDown}>
      <Button
        ref={triggerRef}
        variant="unstyled"
        className={triggerClassName}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        {children}
      </Button>
      {open && (
        <ul
          ref={listRef}
          id={menuId}
          role="menu"
          aria-label={label}
          className={classNames('ui-menu-list', (above || moved.above) && 'ui-menu-list--above', moved.end && 'ui-menu-list--end')}
        >
          {items.map((item) => (
            <li key={item.key} role="none" className={classNames(item.separatorBefore && 'ui-menu-separator')}>
              <Button
                variant="unstyled"
                role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
                aria-checked={item.checked}
                className="ui-menu-item"
                tabIndex={-1}
                onClick={() => { close(true); item.onSelect() }}
              >
                {item.icon}
                <span className="ui-menu-item_label">{item.label}</span>
                {item.hint && <span className="ui-menu-item_hint">{item.hint}</span>}
                {item.checked && <Check className="ui-menu-item_check" aria-hidden="true" />}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
