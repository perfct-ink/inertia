import '@testing-library/jest-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { Timeline } from './Timeline'
import { KEY_SAVE_DELAY_MS, KEY_SETTLE_MS } from '@/hooks/useBarKeyboard'
import type { Scheduled } from '@/data/schedule'

const row = (id: number, title: string, start_date: string, target_date: string, extra: Partial<Scheduled> = {}): Scheduled => ({
  id, title, start_date, target_date, tasks_count: 1, done_tasks_count: 0, key: `epic-${id}`, ...extra,
})
const design = row(1, 'Design', '2026-11-01', '2026-11-03')
const build = row(2, 'Build', '2026-11-05', '2026-11-10')

const bar = (name: string) => screen.getByRole('group', { name: new RegExp(`^${name},`) })
const press = (el: HTMLElement, key: string, init: Partial<KeyboardEventInit> = {}) => fireEvent.keyDown(el, { key, ...init })
// jsdom may not build pointer events with coordinates; a mouse event of the same type carries them.
const pointer = (el: HTMLElement, type: string, clientX: number) =>
  fireEvent(el, new MouseEvent(type, { bubbles: true, cancelable: true, clientX }))
const wait = (ms: number) => act(() => { jest.advanceTimersByTime(ms) })

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

test('an editable bar is a tab stop named with its dates; a read-only chart has none', () => {
  const { rerender, container } = render(<Timeline items={[design]} onReschedule={jest.fn()} />)
  const el = bar('Design')
  expect(el).toHaveAttribute('tabindex', '0')
  expect(el).toHaveAccessibleName('Design, 2026-11-01 to 2026-11-03')
  expect(el).toHaveAccessibleDescription(/arrow keys move it a day/)

  rerender(<Timeline items={[design]} />)
  expect(container.querySelector('[tabindex]')).toBeNull()
  expect(screen.queryByText(/arrow keys move it/)).not.toBeInTheDocument()
})

test('canReschedule and group rows decide which bars take the keys', () => {
  const group = row(3, 'Launch', '2026-11-01', '2026-11-30', { key: 'initiative-3', group: true })
  const { rerender } = render(<Timeline items={[design, group]} onReschedule={jest.fn()} />)
  expect(screen.getAllByRole('group')).toHaveLength(1)

  rerender(<Timeline items={[design, group]} onReschedule={jest.fn()} canReschedule={(item) => item.key === 'initiative-3'} />)
  expect(screen.getAllByRole('group')).toHaveLength(1)
  expect(bar('Launch')).toBeInTheDocument()
})

test('the keyboard hint shows only when some bar can be moved', () => {
  const group = row(3, 'Launch', '2026-11-01', '2026-11-30', { key: 'initiative-3', group: true })
  const { rerender } = render(<Timeline items={[group]} onReschedule={jest.fn()} />)
  expect(screen.queryByText(/arrow keys move it/)).not.toBeInTheDocument()
  rerender(<Timeline items={[group, design]} onReschedule={jest.fn()} />)
  expect(screen.getByText(/arrow keys move it/)).toBeInTheDocument()
})

test('arrow presses move the bar a day each and save once after a pause', () => {
  const onReschedule = jest.fn()
  render(<Timeline items={[design]} onReschedule={onReschedule} />)
  const el = bar('Design')
  press(el, 'ArrowRight')
  press(el, 'ArrowRight')
  expect(el).toHaveAccessibleName('Design, 2026-11-03 to 2026-11-05')
  expect(screen.getByRole('status')).toHaveTextContent('Design: 2026-11-03 to 2026-11-05')
  expect(onReschedule).not.toHaveBeenCalled()

  wait(KEY_SAVE_DELAY_MS)
  expect(onReschedule).toHaveBeenCalledTimes(1)
  expect(onReschedule).toHaveBeenCalledWith(design, '2026-11-03', '2026-11-05')
})

test('Shift changes the end, Alt the start, and Page keys use a week', () => {
  const onReschedule = jest.fn()
  render(<Timeline items={[build]} onReschedule={onReschedule} />)
  const el = bar('Build')
  press(el, 'ArrowRight', { shiftKey: true })
  press(el, 'ArrowLeft', { altKey: true })
  expect(el).toHaveAccessibleName('Build, 2026-11-04 to 2026-11-11')
  press(el, 'PageDown')
  expect(el).toHaveAccessibleName('Build, 2026-11-11 to 2026-11-18')
  wait(KEY_SAVE_DELAY_MS)
  expect(onReschedule).toHaveBeenCalledWith(build, '2026-11-11', '2026-11-18')
})

test('Enter saves at once, Escape drops an unsaved move, and leaving the bar saves it', () => {
  const onReschedule = jest.fn()
  render(<Timeline items={[design, build]} onReschedule={onReschedule} />)
  const first = bar('Design')

  press(first, 'ArrowRight')
  press(first, 'Enter')
  expect(onReschedule).toHaveBeenCalledWith(design, '2026-11-02', '2026-11-04')

  onReschedule.mockClear()
  const second = bar('Build')
  press(second, 'ArrowLeft')
  press(second, 'Escape')
  expect(second).toHaveAccessibleName('Build, 2026-11-05 to 2026-11-10')
  wait(KEY_SAVE_DELAY_MS)
  expect(onReschedule).not.toHaveBeenCalled()

  press(second, 'ArrowLeft')
  fireEvent.blur(second)
  expect(onReschedule).toHaveBeenCalledWith(build, '2026-11-04', '2026-11-09')
})

test('a resize cannot invert a bar, and an unchanged range saves nothing', () => {
  const onReschedule = jest.fn()
  render(<Timeline items={[design]} onReschedule={onReschedule} />)
  const el = bar('Design')
  press(el, 'PageUp', { shiftKey: true })
  expect(el).toHaveAccessibleName('Design, 2026-11-01 to 2026-11-01')
  press(el, 'ArrowLeft', { shiftKey: true })
  press(el, 'Enter')
  expect(onReschedule).toHaveBeenCalledTimes(1)
  press(el, 'ArrowRight', { altKey: true })
  press(el, 'Enter')
  expect(onReschedule).toHaveBeenCalledTimes(1)
})

test('keys that are not ours, or browser shortcuts, are left alone', () => {
  const onReschedule = jest.fn()
  render(<Timeline items={[design]} onReschedule={onReschedule} />)
  const el = bar('Design')
  expect(fireEvent.keyDown(el, { key: 'ArrowRight', metaKey: true })).toBe(true)
  expect(fireEvent.keyDown(el, { key: 'ArrowUp' })).toBe(true)
  expect(fireEvent.keyDown(el, { key: 'ArrowRight' })).toBe(false)
  wait(KEY_SETTLE_MS)
})

test('the bar goes back to its saved dates if nothing changes after the save', () => {
  render(<Timeline items={[design]} onReschedule={jest.fn()} />)
  const el = bar('Design')
  press(el, 'ArrowRight')
  press(el, 'Enter')
  expect(el).toHaveAccessibleName('Design, 2026-11-02 to 2026-11-04')
  wait(KEY_SETTLE_MS)
  expect(el).toHaveAccessibleName('Design, 2026-11-01 to 2026-11-03')
})

test('the new dates take over once the saved dates arrive', () => {
  const { rerender } = render(<Timeline items={[design]} onReschedule={jest.fn()} />)
  press(bar('Design'), 'ArrowRight')
  press(bar('Design'), 'Enter')
  rerender(<Timeline items={[{ ...design, start_date: '2026-11-02', target_date: '2026-11-04' }]} onReschedule={jest.fn()} />)
  expect(bar('Design')).toHaveAccessibleName('Design, 2026-11-02 to 2026-11-04')
  wait(KEY_SETTLE_MS)
  expect(bar('Design')).toHaveAccessibleName('Design, 2026-11-02 to 2026-11-04')
})

test('dependency arrows and the today line follow a bar while it moves', () => {
  const links = [{ from: 'epic-1', to: 'epic-2', kind: 'finish_to_start' as const }]
  const { container } = render(<Timeline items={[design, build]} links={links} onReschedule={jest.fn()} />)
  const path = () => container.querySelector('.timeline-link')?.getAttribute('d')
  const before = path()
  expect(container.querySelector('.timeline-rows--editing')).toBeNull()

  press(bar('Design'), 'ArrowRight')
  expect(path()).not.toBe(before)
  expect(bar('Design').style.left).toMatch(/^3\.33/)
  expect(container.querySelector('.timeline-rows--editing')).not.toBeNull()

  press(bar('Design'), 'Escape')
  expect(path()).toBe(before)
  expect(container.querySelector('.timeline-rows--editing')).toBeNull()
})

test('dragging a bar previews its dates for the arrows and saves on release', () => {
  const onReschedule = jest.fn()
  const links = [{ from: 'epic-1', to: 'epic-2', kind: 'finish_to_start' as const }]
  const { container } = render(<Timeline items={[design, build]} links={links} onReschedule={onReschedule} />)
  const el = bar('Design')
  const track = el.parentElement as HTMLElement
  Object.defineProperty(track, 'clientWidth', { value: 300 })
  el.setPointerCapture = jest.fn()
  const before = container.querySelector('.timeline-link')?.getAttribute('d')

  // 300px for the 30 days of November: 20px is two days.
  pointer(el, 'pointerdown', 100)
  pointer(el, 'pointermove', 120)
  expect(el).toHaveAccessibleName('Design, 2026-11-03 to 2026-11-05')
  expect(container.querySelector('.timeline-link')?.getAttribute('d')).not.toBe(before)

  pointer(el, 'pointerup', 120)
  expect(onReschedule).toHaveBeenCalledWith(design, '2026-11-03', '2026-11-05')
  expect(el).toHaveAccessibleName('Design, 2026-11-01 to 2026-11-03')
})
