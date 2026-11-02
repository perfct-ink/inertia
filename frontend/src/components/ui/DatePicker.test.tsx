import { createRef, useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import { todayISO } from '@/util/date'
import { DatePicker } from './index'

function Harness({ initial = '', onValue, ...props }: { initial?: string; onValue?: (value: string) => void } & Partial<React.ComponentProps<typeof DatePicker>>) {
  const [value, setValue] = useState(initial)
  return <DatePicker aria-label="Due date" {...props} value={value} onChange={(e) => { setValue(e.target.value); onValue?.(e.target.value) }} />
}

const field = () => screen.getByRole('combobox', { name: 'Due date' })
const calendar = () => screen.getByRole('dialog', { name: 'Choose date' })
const day = (label: string) => within(calendar()).getByRole('button', { name: label })

test('shows the value in a text box and keeps the calendar closed until it is clicked', () => {
  render(<Harness initial="2026-11-02" />)
  expect(field()).toHaveValue('2026-11-02')
  expect(screen.queryByRole('dialog', { name: 'Choose date' })).toBeNull()
  fireEvent.click(field())
  expect(calendar()).toBeInTheDocument()
  expect(within(calendar()).getByText('November 2026')).toBeInTheDocument()
  expect(field()).toHaveAttribute('aria-expanded', 'true')
})

test('picking a day sends its YYYY-MM-DD through onChange and closes the calendar', () => {
  const onValue = jest.fn()
  render(<Harness initial="2026-11-02" onValue={onValue} />)
  fireEvent.click(field())
  fireEvent.click(day('Friday, November 20, 2026'))
  expect(onValue).toHaveBeenCalledWith('2026-11-20')
  expect(field()).toHaveValue('2026-11-20')
  expect(screen.queryByRole('dialog', { name: 'Choose date' })).toBeNull()
})

test('the month arrows change the month without changing the value', () => {
  const onValue = jest.fn()
  render(<Harness initial="2026-11-02" onValue={onValue} />)
  fireEvent.click(field())
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
  expect(within(calendar()).getByText('December 2026')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
  expect(within(calendar()).getByText('October 2026')).toBeInTheDocument()
  expect(onValue).not.toHaveBeenCalled()
  expect(field()).toHaveValue('2026-11-02')
})

test('typing a complete date sends it, half-typed text is not sent and goes back on blur', () => {
  const onValue = jest.fn()
  render(<Harness initial="2026-11-02" onValue={onValue} />)
  fireEvent.change(field(), { target: { value: '2026-11-1' } })
  expect(onValue).not.toHaveBeenCalled()
  expect(field()).toHaveValue('2026-11-1')
  fireEvent.blur(field())
  expect(field()).toHaveValue('2026-11-02')
  fireEvent.change(field(), { target: { value: '2026-12-25' } })
  expect(onValue).toHaveBeenCalledWith('2026-12-25')
})

test('a date that is not on the calendar is not sent', () => {
  const onValue = jest.fn()
  render(<Harness initial="2026-11-02" onValue={onValue} />)
  fireEvent.change(field(), { target: { value: '2026-02-30' } })
  expect(onValue).not.toHaveBeenCalled()
})

test('clearing the text and the Clear button both send an empty value', () => {
  const onValue = jest.fn()
  render(<Harness initial="2026-11-02" onValue={onValue} />)
  fireEvent.change(field(), { target: { value: '' } })
  expect(onValue).toHaveBeenLastCalledWith('')
  fireEvent.change(field(), { target: { value: '2026-11-05' } })
  fireEvent.click(field())
  fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
  expect(onValue).toHaveBeenLastCalledWith('')
  expect(field()).toHaveValue('')
})

test('Today picks today', () => {
  const onValue = jest.fn()
  render(<Harness onValue={onValue} />)
  fireEvent.click(field())
  fireEvent.click(screen.getByRole('button', { name: 'Today' }))
  expect(onValue).toHaveBeenCalledWith(todayISO())
})

test('the arrow keys, Page keys and Enter pick a date without leaving the text box', () => {
  const onValue = jest.fn()
  render(<Harness initial="2026-11-02" onValue={onValue} />)
  fireEvent.keyDown(field(), { key: 'ArrowDown' })
  expect(calendar()).toBeInTheDocument()
  fireEvent.keyDown(field(), { key: 'ArrowDown' })
  fireEvent.keyDown(field(), { key: 'PageDown' })
  expect(field()).toHaveAttribute('aria-activedescendant', expect.stringContaining('2026-12-09'))
  fireEvent.keyDown(field(), { key: 'ArrowUp' })
  fireEvent.keyDown(field(), { key: 'Enter' })
  expect(onValue).toHaveBeenCalledWith('2026-12-02')
  expect(calendar).toThrow()
})

test('Enter without moving through the calendar is left for the form', () => {
  render(<Harness initial="2026-11-02" />)
  fireEvent.click(field())
  const enter = fireEvent.keyDown(field(), { key: 'Enter' })
  expect(enter).toBe(true)
  expect(screen.queryByRole('dialog', { name: 'Choose date' })).toBeNull()
})

test('Escape closes the calendar and keeps the value', () => {
  render(<Harness initial="2026-11-02" />)
  fireEvent.click(field())
  fireEvent.keyDown(field(), { key: 'Escape' })
  expect(screen.queryByRole('dialog', { name: 'Choose date' })).toBeNull()
  expect(field()).toHaveValue('2026-11-02')
})

test('pressing in the calendar does not take focus from the text box', () => {
  render(<Harness initial="2026-11-02" />)
  field().focus()
  fireEvent.click(field())
  const notPrevented = fireEvent.mouseDown(day('Friday, November 20, 2026'))
  expect(notPrevented).toBe(false)
  expect(field()).toHaveFocus()
})

test('days outside min and max cannot be picked', () => {
  render(<Harness initial="2026-11-10" min="2026-11-05" max="2026-11-25" />)
  fireEvent.click(field())
  expect(day('Tuesday, November 3, 2026')).toBeDisabled()
  expect(day('Friday, November 6, 2026')).toBeEnabled()
  expect(day('Friday, November 27, 2026')).toBeDisabled()
})

test('the selected day is marked for screen readers', () => {
  render(<Harness initial="2026-11-02" />)
  fireEvent.click(field())
  const cell = day('Monday, November 2, 2026').closest('td')
  expect(cell).toHaveAttribute('aria-selected', 'true')
})

test('a disabled or read-only field does not open', () => {
  const { rerender } = render(<Harness initial="2026-11-02" disabled />)
  fireEvent.click(field())
  expect(screen.queryByRole('dialog', { name: 'Choose date' })).toBeNull()
  rerender(<Harness initial="2026-11-02" readOnly />)
  fireEvent.keyDown(field(), { key: 'ArrowDown' })
  expect(screen.queryByRole('dialog', { name: 'Choose date' })).toBeNull()
})

test('preserves native props and the element ref like the shared Input', () => {
  const ref = createRef<HTMLInputElement>()
  render(<DatePicker ref={ref} aria-label="Start" name="start_date" required defaultValue="2026-11-02" />)
  expect(ref.current).toBe(screen.getByLabelText('Start'))
  expect(ref.current).toHaveAttribute('name', 'start_date')
  expect(ref.current).toBeRequired()
  expect(ref.current).toHaveValue('2026-11-02')
})

test('a new value from the parent replaces the text', () => {
  const { rerender } = render(<DatePicker aria-label="Due date" value="2026-11-02" onChange={() => undefined} />)
  rerender(<DatePicker aria-label="Due date" value="2026-12-01" onChange={() => undefined} />)
  expect(field()).toHaveValue('2026-12-01')
})
