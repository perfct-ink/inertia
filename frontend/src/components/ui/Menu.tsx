import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
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
}

// A dropdown menu anchored to its trigger. Arrow keys, Home and End move
// between items, Enter/Space choose one, Escape closes and gives focus back
// to the trigger, and a click outside closes it.
export function Menu({ label, children, items, triggerClassName }: MenuProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

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
        <ul id={menuId} role="menu" aria-label={label} className="ui-menu-list">
          {items.map((item) => (
            <li key={item.key} role="none" className={classNames(item.separatorBefore && 'ui-menu-separator')}>
              <Button
                variant="unstyled"
                role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
                aria-checked={item.checked}
                className="ui-menu-item"
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
