import { createRef } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { Button, Input, Select, Textarea } from './index'

test('shared fields preserve native props, change events, and element refs', () => {
  const input = createRef<HTMLInputElement>()
  const select = createRef<HTMLSelectElement>()
  const textarea = createRef<HTMLTextAreaElement>()
  const change = jest.fn()
  render(<>
    <Input ref={input} aria-label="Email" type="email" required onChange={change} />
    <Select ref={select} aria-label="Status" onChange={change}>
      <option value="todo">To do</option><option value="done">Done</option>
    </Select>
    <Textarea ref={textarea} aria-label="Notes" onChange={change} />
  </>)
  expect(input.current).toBe(screen.getByLabelText('Email'))
  expect(input.current).toHaveAttribute('type', 'email')
  expect(input.current).toBeRequired()
  expect(select.current).toBe(screen.getByLabelText('Status'))
  expect(textarea.current).toBe(screen.getByLabelText('Notes'))
  fireEvent.change(input.current!, { target: { value: 'ada@example.com' } })
  fireEvent.change(select.current!, { target: { value: 'done' } })
  fireEvent.change(textarea.current!, { target: { value: 'Launch notes' } })
  expect(change).toHaveBeenCalledTimes(3)
})

test('shared buttons preserve implicit form submission and disabled actions', () => {
  const submit = jest.fn(e => e.preventDefault())
  const blocked = jest.fn()
  const button = createRef<HTMLButtonElement>()
  render(<form onSubmit={submit}>
    <Button ref={button} variant="primary">Save</Button>
    <Button type="button" disabled onClick={blocked}>Blocked</Button>
  </form>)
  expect(button.current).toBe(screen.getByRole('button', { name: 'Save' }))
  fireEvent.click(button.current!)
  expect(submit).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Blocked' }))
  expect(blocked).not.toHaveBeenCalled()
})

test('checkbox inputs retain native selection behavior', () => {
  const change = jest.fn()
  render(<Input type="checkbox" aria-label="Complete task" onChange={change} />)
  const checkbox = screen.getByRole('checkbox', { name: 'Complete task' })
  fireEvent.click(checkbox)
  expect(checkbox).toBeChecked()
  expect(change).toHaveBeenCalledTimes(1)
})
