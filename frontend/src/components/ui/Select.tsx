import {
  Children, Fragment, forwardRef, isValidElement, useEffect, useId, useImperativeHandle, useRef, useState,
  type ChangeEvent, type KeyboardEvent, type MouseEvent, type ReactNode, type SelectHTMLAttributes,
} from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Check } from 'lucide-react'
import { classNames } from './classNames'
import './Select.scss'

interface SelectOption {
  value: string
  label: ReactNode
  text: string
  disabled: boolean
}

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children)
  return ''
}

// The <option> elements among a select's children, through fragments and optgroups.
function readOptions(children: ReactNode): SelectOption[] {
  const options: SelectOption[] = []
  Children.forEach(children, (child) => {
    if (!isValidElement<{ children?: ReactNode, value?: unknown, disabled?: boolean }>(child)) return
    const { children: label, value, disabled } = child.props
    if (child.type === 'option') {
      options.push({ value: value === undefined ? textOf(label) : String(value), label, text: textOf(label), disabled: !!disabled })
    } else if (child.type === 'optgroup' || child.type === Fragment) {
      options.push(...readOptions(label))
    }
  })
  return options
}

// Sets a select's value so React's onChange sees it, as if the person had picked it.
function pickNativeValue(select: HTMLSelectElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set?.call(select, value)
  select.dispatchEvent(new Event('change', { bubbles: true }))
}

// A dropdown that looks the same in every browser (design principle 2). It
// takes the same props and <option> children as a native select, and keeps
// one in the page, hidden under the styled face: it holds the value, is what
// labels, forms, screen readers and the keyboard focus, and fires onChange.
// Clicking the face, or Arrow keys, Enter or Space on the focused select,
// opens the list; Arrow keys, Home, End and typing move through it, Enter or
// Space picks, and Escape, Tab or a click outside closes it.
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, style, title, children, value, defaultValue, onChange, onKeyDown, disabled, ...props }, ref
) {
  const selectRef = useRef<HTMLSelectElement>(null)
  const faceRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  useImperativeHandle(ref, () => selectRef.current!)
  const listId = useId()
  const options = readOptions(children)
  const firstEnabled = options.findIndex((o) => !o.disabled)

  const controlled = value !== undefined
  const [uncontrolledValue, setUncontrolledValue] = useState(() =>
    defaultValue !== undefined ? String(defaultValue) : (options[Math.max(0, firstEnabled)]?.value ?? ''))
  const current = controlled ? String(value) : uncontrolledValue
  // Like a native select, an unknown value shows the first option.
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === current))

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const typeahead = useRef({ text: '', at: 0 })

  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView?.({ block: 'nearest' })
  }, [open, active])

  function openList() {
    if (disabled || !options.length) return
    setActive(options[selectedIndex]?.disabled ? firstEnabled : selectedIndex)
    setOpen(true)
  }

  function choose(option: SelectOption | undefined) {
    const select = selectRef.current
    if (!select || !option || option.disabled) return
    setOpen(false)
    if (option.value !== select.value) pickNativeValue(select, option.value)
  }

  // The next enabled option from `from` in `step` direction, or `from` at an end.
  function step(from: number, by: 1 | -1) {
    for (let i = from + by; i >= 0 && i < options.length; i += by) if (!options[i].disabled) return i
    return from
  }

  function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    if (!controlled) setUncontrolledValue(e.target.value)
    onChange?.(e)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLSelectElement>) {
    onKeyDown?.(e)
    if (e.defaultPrevented) return
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList() }
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => step(i, 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => step(i, -1)) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(step(-1, 1)) }
    else if (e.key === 'End') { e.preventDefault(); setActive(step(options.length, -1)) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(options[active]) }
    else if (e.key === 'Tab') setOpen(false)
    else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      const now = Date.now()
      const text = (now - typeahead.current.at < 500 ? typeahead.current.text : '') + e.key.toLowerCase()
      typeahead.current = { text, at: now }
      const order = [...options.keys()].map((i) => (active + (text.length > 1 ? 0 : 1) + i) % options.length)
      const match = order.find((i) => !options[i].disabled && options[i].text.toLowerCase().startsWith(text))
      if (match !== undefined) setActive(match)
    }
  }

  function handleFaceClick(e: MouseEvent) {
    // A wrapping <label> forwards its click to the select; that isn't a click on the face.
    if (disabled || e.target === selectRef.current) return
    selectRef.current?.focus()
    if (open) setOpen(false)
    else openList()
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <div
          ref={faceRef}
          className={classNames('ui-select', open && 'ui-select--open', disabled && 'ui-select--disabled', className)}
          style={style}
          title={title}
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleFaceClick}
        >
          <select
            {...props}
            ref={selectRef}
            value={value}
            defaultValue={defaultValue}
            disabled={disabled}
            className="ui-select-native"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          >
            {children}
          </select>
          {/* Every label sits in one grid cell, so the face is as wide as the
              longest option and doesn't resize when the choice changes. The
              text is drawn from data-label so it never joins a wrapping
              <label>'s text. */}
          <span className="ui-select-value" aria-hidden="true">
            {options.map((o, i) => (
              <span
                key={i}
                data-label={o.text || '\u00a0'}
                className={classNames('ui-select-value_item', i === selectedIndex && 'ui-select-value_item--current')}
              />
            ))}
          </span>
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          ref={listRef}
          id={listId}
          role="listbox"
          className="ui-select-list"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          onMouseDown={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => { if (faceRef.current?.contains(e.target as Node)) e.preventDefault() }}
        >
          {options.map((o, i) => (
            <div
              key={i}
              id={`${listId}-${i}`}
              data-index={i}
              role="option"
              aria-selected={i === selectedIndex}
              aria-disabled={o.disabled || undefined}
              className={classNames('ui-select-option', i === active && 'ui-select-option--active')}
              onPointerMove={() => { if (!o.disabled) setActive(i) }}
              onClick={() => choose(o)}
            >
              <span className="ui-select-option_label">{o.label}</span>
              {i === selectedIndex && <Check className="ui-select-option_check" aria-hidden="true" />}
            </div>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
})
