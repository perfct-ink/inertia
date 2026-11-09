import {
  forwardRef, useCallback, useEffect, useId, useLayoutEffect, useRef, useState,
  type ChangeEvent, type FocusEvent, type KeyboardEvent, type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDays, addMonths, clampToRange, dayLabel, isValidISODate, monthGrid, monthLabel, outOfRange, parseISODate, weekdayHeadings } from '@/util/calendar'
import { todayISO } from '@/util/date'
import { Button } from './Button'
import { Input, type InputProps } from './Input'
import { classNames } from './classNames'
import './DatePicker.scss'

type DatePickerProps = Omit<InputProps, 'type' | 'inputMode'>

const WEEK_STARTS_ON = 0
const POPUP_GAP = 4
const POPUP_MAX_WIDTH = 320
const VIEWPORT_MARGIN = 16

// Same value and onChange contract as <input type="date">: value is YYYY-MM-DD
// or '', and onChange runs with an event whose target.value is that string
// (so callers only swap the component). The field is a text box you can type
// into, and clicking it (or ArrowDown) opens a calendar that looks the same in
// every browser. Focus never leaves the text box while the calendar is open,
// so parents that react to the field's blur (like the Tasks add row) behave as
// they did with the native input.
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  { value, defaultValue, onChange, onBlur, onClick, onKeyDown, className, min, max, disabled, readOnly, autoFocus, placeholder = 'YYYY-MM-DD', ...props }, ref
) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)
  const navigatedRef = useRef(false)
  const id = useId()
  const popupId = `${id}-calendar`
  const controlled = value !== undefined
  const [text, setText] = useState(String(value ?? defaultValue ?? ''))
  const [lastValid, setLastValid] = useState(isValidISODate(text) ? text : '')
  const [seenValue, setSeenValue] = useState(value)
  const [open, setOpen] = useState(!!autoFocus && !disabled && !readOnly)
  const [active, setActive] = useState('')
  const [position, setPosition] = useState<{ position: 'fixed' | 'absolute'; top: number; left: number; width: number } | null>(null)

  // A new value from the parent replaces what is typed.
  if (controlled && value !== seenValue) {
    setSeenValue(value)
    setText(String(value))
    if (isValidISODate(String(value)) || value === '') setLastValid(String(value))
  }

  const selected = isValidISODate(text) ? text : ''
  const activeDay = active || clampToRange(selected || todayISO(), String(min ?? ''), String(max ?? ''))
  const parsedActive = parseISODate(activeDay) ?? parseISODate(todayISO())!
  const interactive = !disabled && !readOnly
  const coarsePointer = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches

  const setInputRef = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }, [ref])

  function show() {
    if (!interactive) return
    navigatedRef.current = false
    setActive(clampToRange(selected || todayISO(), String(min ?? ''), String(max ?? '')))
    setOpen(true)
  }

  const close = useCallback(() => {
    setOpen(false)
    setActive('')
    setPosition(null)
  }, [])

  // Sends a value through the text box so the parent's onChange gets a real
  // change event, exactly as it did with the native date input.
  function commit(next: string) {
    const input = inputRef.current
    if (!input) return
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, next)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    close()
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    setText(next)
    if (next === '' || isValidISODate(next)) {
      setLastValid(next)
      if (next && open) setActive(next)
      onChange?.(e)
    }
  }

  function handleBlur(e: FocusEvent<HTMLInputElement>) {
    close()
    // Half-typed text goes back to the last real date, like the native field.
    if (text !== '' && !isValidISODate(text)) setText(controlled ? String(value) : lastValid)
    onBlur?.(e)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    onKeyDown?.(e)
    if (e.defaultPrevented || !interactive) return
    if (!open) {
      if (e.key === 'ArrowDown') { e.preventDefault(); show() }
      return
    }
    const move = (next: string) => { e.preventDefault(); navigatedRef.current = true; setActive(next) }
    switch (e.key) {
      case 'ArrowDown': return move(addDays(activeDay, 7))
      case 'ArrowUp': return move(addDays(activeDay, -7))
      // ArrowLeft and ArrowRight keep moving the cursor in the text.
      case 'PageDown': return move(addMonths(activeDay, e.shiftKey ? 12 : 1))
      case 'PageUp': return move(addMonths(activeDay, e.shiftKey ? -12 : -1))
      case 'Escape': e.preventDefault(); e.stopPropagation(); return close()
      case 'Enter':
        if (navigatedRef.current && !outOfRange(activeDay, String(min ?? ''), String(max ?? ''))) { e.preventDefault(); commit(activeDay) }
        else close()
    }
  }

  function handleClick(e: MouseEvent<HTMLInputElement>) {
    onClick?.(e)
    if (!open) show()
  }

  // Below the field, or above when there is no room. Inside a dialog the popup
  // is placed in the dialog (so clicking it is not "outside" the dialog); a
  // dialog is positioned, so the offsets are relative to it.
  const place = useCallback(() => {
    const input = inputRef.current
    if (!input) return
    const rect = input.getBoundingClientRect()
    const dialog = input.closest<HTMLElement>('[role="dialog"]')
    const dialogRect = dialog?.getBoundingClientRect()
    const width = Math.min(POPUP_MAX_WIDTH, window.innerWidth - 2 * VIEWPORT_MARGIN)
    const height = popupRef.current?.offsetHeight ?? 0
    const below = rect.bottom + POPUP_GAP
    const above = rect.top - POPUP_GAP - height
    const top = below + height > window.innerHeight && above > 0 ? above : below
    const left = Math.max(VIEWPORT_MARGIN, Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN))
    setPosition(dialog && dialogRect
      ? { position: 'absolute', top: top - dialogRect.top - dialog.clientTop + dialog.scrollTop, left: left - dialogRect.left - dialog.clientLeft + dialog.scrollLeft, width }
      : { position: 'fixed', top, left, width })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, activeDay, place])

  // The popup is not focusable (focus stays in the field), so it needs its own
  // way to close when something else is clicked while the field keeps focus.
  useEffect(() => {
    if (!open) return
    function away(e: PointerEvent) {
      const target = e.target as Node
      if (!popupRef.current?.contains(target) && !inputRef.current?.contains(target)) close()
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open, close])

  const host = inputRef.current?.closest<HTMLElement>('[role="dialog"]') ?? document.body
  const weeks = monthGrid(parsedActive.year, parsedActive.month, WEEK_STARTS_ON)
  const headings = weekdayHeadings(WEEK_STARTS_ON)
  const today = todayISO()
  const cellId = (iso: string) => `${id}-day-${iso}`
  const title = monthLabel(parsedActive.year, parsedActive.month)
  // Keeps the text box focused: a mouse press on the calendar must not blur it.
  const keepFocus = (e: MouseEvent) => e.preventDefault()

  return (
    <>
      <Input
        {...props}
        ref={setInputRef}
        type="text"
        role="combobox"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popupId : undefined}
        aria-activedescendant={open ? cellId(activeDay) : undefined}
        autoComplete="off"
        spellCheck={false}
        // A touch keyboard would cover the calendar; touch users pick from it.
        inputMode={coarsePointer ? 'none' : 'numeric'}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        readOnly={readOnly}
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={classNames('ui-date_picker-input', className)}
      />
      {open && createPortal(
        <div
          ref={popupRef}
          id={popupId}
          role="dialog"
          aria-label="Choose date"
          className="ui-date_picker"
          // Measured before it is shown, so it never flashes in the wrong place.
          style={position ?? { visibility: 'hidden' }}
          onMouseDown={keepFocus}
        >
          <div className="ui-date_picker-header">
            <Button type="button" variant="ghost" className="ui-date_picker-nav" aria-label="Previous month" onClick={() => setActive(addMonths(activeDay, -1))}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="ui-date_picker-title" aria-live="polite">{title}</span>
            <Button type="button" variant="ghost" className="ui-date_picker-nav" aria-label="Next month" onClick={() => setActive(addMonths(activeDay, 1))}>
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <table role="grid" aria-label={title} className="ui-date_picker-grid">
            <thead>
              <tr>
                {headings.map((h) => <th key={h.full} scope="col" abbr={h.full}>{h.short}</th>)}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week[0].iso}>
                  {week.map((d) => (
                    <td key={d.iso} id={cellId(d.iso)} role="gridcell" aria-selected={d.iso === selected}>
                      <Button
                        type="button"
                        tabIndex={-1}
                        aria-label={dayLabel(d.iso)}
                        aria-current={d.iso === today ? 'date' : undefined}
                        disabled={outOfRange(d.iso, String(min ?? ''), String(max ?? ''))}
                        className={classNames(
                          'ui-date_picker-day',
                          !d.inMonth && 'ui-date_picker-day--outside',
                          d.iso === today && 'ui-date_picker-day--today',
                          d.iso === selected && 'ui-date_picker-day--selected',
                          d.iso === activeDay && 'ui-date_picker-day--active',
                        )}
                        onClick={() => commit(d.iso)}
                      >
                        {d.day}
                      </Button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ui-date_picker-footer">
            <Button type="button" variant="ghost" disabled={outOfRange(today, String(min ?? ''), String(max ?? ''))} onClick={() => commit(today)}>Today</Button>
            <Button type="button" variant="ghost" disabled={selected === '' && text === ''} onClick={() => commit('')}>Clear</Button>
          </div>
        </div>,
        host,
      )}
    </>
  )
})
