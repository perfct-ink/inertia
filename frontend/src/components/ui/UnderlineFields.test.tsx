import '@testing-library/jest-dom'
import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { DatePicker, Input, Select, Textarea } from './index'

test('the underline variant adds a class to each field and keeps its native props and ref', () => {
  const input = createRef<HTMLInputElement>()
  const textarea = createRef<HTMLTextAreaElement>()
  const change = jest.fn()
  render(<>
    <Input ref={input} variant="underline" aria-label="Unit" className="extra" onChange={change} />
    <Textarea ref={textarea} variant="underline" aria-label="Description" onChange={change} />
    <Select variant="underline" aria-label="Status" className="extra" onChange={change}>
      <option value="todo">To do</option><option value="done">Done</option>
    </Select>
  </>)
  expect(input.current).toBe(screen.getByLabelText('Unit'))
  expect(input.current).toHaveClass('ui-input', 'ui-input--underline', 'extra')
  expect(textarea.current).toBe(screen.getByLabelText('Description'))
  expect(textarea.current).toHaveClass('ui-textarea', 'ui-textarea--underline')
  const select = screen.getByLabelText('Status')
  expect(select.closest('.ui-select')).toHaveClass('ui-select--underline', 'extra')
  // `variant` styles the field; it is never passed down to the DOM.
  for (const el of [input.current!, textarea.current!, select, select.closest('.ui-select')!]) expect(el).not.toHaveAttribute('variant')
  fireEvent.change(input.current!, { target: { value: '%' } })
  fireEvent.change(select, { target: { value: 'done' } })
  expect(change).toHaveBeenCalledTimes(2)
})

test('a field without a variant keeps its usual look', () => {
  render(<><Input aria-label="Name" /><Select aria-label="Kind"><option>A</option></Select></>)
  expect(screen.getByLabelText('Name')).not.toHaveClass('ui-input--underline')
  expect(screen.getByLabelText('Kind').closest('.ui-select')).not.toHaveClass('ui-select--underline')
})

test('a date field takes the underline variant too', () => {
  render(<DatePicker variant="underline" aria-label="Due" value="2026-11-09" onChange={() => {}} />)
  expect(screen.getByRole('combobox', { name: 'Due' })).toHaveClass('ui-date_picker-input', 'ui-input--underline')
})
