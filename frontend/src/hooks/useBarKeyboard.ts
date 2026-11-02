import { useCallback, useEffect, useRef, type FocusEvent, type KeyboardEvent } from 'react'
import { barKeyAction, shiftedRange, type DateRange } from '@/data/schedule'

// Quiet time after the last key press before the new dates are saved, so a run
// of arrow presses is one save instead of one per day.
export const KEY_SAVE_DELAY_MS = 600
// How long a bar keeps the dates it was moved to once saved. The saved dates
// normally arrive first and take over; this only matters when the save was
// refused or failed (an error is shown), which puts the bar back.
export const KEY_SETTLE_MS = 3000

// Keyboard rescheduling for one focused Gantt bar (see barKeyAction for the
// keys). `range` is the dates the bar is drawn at right now (so presses build
// on each other), `onPreview` shows a range while it is pending and null to
// drop it, and `onSave` stores it. Enter saves at once, Escape drops an
// unsaved change, and leaving the bar saves it. `discard` is for a pointer
// drag starting on the same bar, which replaces whatever the keys had pending.
export function useBarKeyboard({ range, onPreview, onSave }: {
  range: DateRange
  onPreview: (range: DateRange | null) => void
  onSave: (range: DateRange) => void
}) {
  const pending = useRef<DateRange | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const settleTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Timers fire later, so they read the callbacks from the latest render.
  const latest = useRef({ onPreview, onSave })
  useEffect(() => {
    latest.current = { onPreview, onSave }
  })

  const clearTimers = useCallback(() => {
    clearTimeout(saveTimer.current)
    clearTimeout(settleTimer.current)
  }, [])

  const save = useCallback(() => {
    clearTimeout(saveTimer.current)
    const next = pending.current
    if (!next) return
    pending.current = null
    latest.current.onSave(next)
    settleTimer.current = setTimeout(() => latest.current.onPreview(null), KEY_SETTLE_MS)
  }, [])

  const discard = useCallback(() => {
    clearTimers()
    pending.current = null
    latest.current.onPreview(null)
  }, [clearTimers])

  // Leaving the page (or the row going away) with a change waiting still saves it.
  useEffect(() => () => {
    clearTimeout(saveTimer.current)
    clearTimeout(settleTimer.current)
    const next = pending.current
    if (next) latest.current.onSave(next)
  }, [])

  const onKeyDown = useCallback((e: KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' && pending.current) {
      e.preventDefault()
      save()
      return
    }
    if (e.key === 'Escape' && pending.current) {
      e.preventDefault()
      discard()
      return
    }
    const action = barKeyAction(e)
    if (!action) return
    e.preventDefault()
    const next = shiftedRange(range.start, range.end, action.mode, action.delta)
    if (next.start === range.start && next.end === range.end) return
    clearTimers()
    pending.current = next
    latest.current.onPreview(next)
    saveTimer.current = setTimeout(save, KEY_SAVE_DELAY_MS)
  }, [range.start, range.end, save, discard, clearTimers])

  const onBlur = useCallback((e: FocusEvent<HTMLElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    save()
  }, [save])

  return { onKeyDown, onBlur, discard }
}
