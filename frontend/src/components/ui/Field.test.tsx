import '@testing-library/jest-dom'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { DatePicker, Field, FormError, Input, Select, Textarea } from './index'

test('the label is tied to the control, so it names the field', () => {
  render(<Field label="Email"><Input /></Field>)
  const input = screen.getByRole('textbox', { name: 'Email' })
  expect(input).toHaveAttribute('id')
  expect(screen.getByText('Email')).toHaveAttribute('for', input.id)
})

test('with no error the control is not invalid and has nothing to describe it', () => {
  render(<Field label="Email"><Input /></Field>)
  const input = screen.getByRole('textbox')
  expect(input).not.toHaveAttribute('aria-invalid')
  expect(input).not.toHaveAttribute('aria-describedby')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('with an error the control is invalid and described by the message', () => {
  render(<Field label="Email" error="Enter a full email address."><Input /></Field>)
  const input = screen.getByRole('textbox', { name: 'Email' })
  expect(input).toBeInvalid()
  const alert = screen.getByRole('alert')
  expect(alert).toHaveTextContent('Enter a full email address.')
  expect(input).toHaveAccessibleDescription('Enter a full email address.')
  expect(input.getAttribute('aria-describedby')).toBe(alert.id)
})

test('the hint is read with the field, before the error', () => {
  render(<Field label="Nickname" hint="Shown next to your comments." error="Too long."><Input /></Field>)
  expect(screen.getByRole('textbox', { name: 'Nickname' })).toHaveAccessibleDescription('Shown next to your comments. Too long.')
})

test('an optional field says so', () => {
  render(<Field label="Nickname" optional><Input /></Field>)
  expect(screen.getByText('(optional)')).toBeInTheDocument()
})

test('the control keeps its own id, native props, aria-describedby and ref', () => {
  const ref = createRef<HTMLInputElement>()
  render(
    <>
      <p id="elsewhere">Also read</p>
      <Field label="Email" error="Nope."><Input ref={ref} id="email" name="email" maxLength={30} aria-describedby="elsewhere" /></Field>
    </>,
  )
  const input = screen.getByRole('textbox', { name: 'Email' })
  expect(input).toHaveAttribute('id', 'email')
  expect(input).toHaveAttribute('name', 'email')
  expect(input).toHaveAttribute('maxlength', '30')
  expect(ref.current).toBe(input)
  expect(input).toHaveAccessibleDescription('Also read Nope.')
})

test('two fields get different ids', () => {
  render(<><Field label="One"><Input /></Field><Field label="Two"><Input /></Field></>)
  const [one, two] = screen.getAllByRole('textbox')
  expect(one.id).not.toBe(two.id)
})

test('a text area, a select and a date picker are marked invalid too', () => {
  render(
    <>
      <Field label="Reason" error="Say why."><Textarea /></Field>
      <Field label="Role" error="Choose a role."><Select defaultValue=""><option value="">Choose…</option></Select></Field>
      <Field label="Due" error="Pick a date."><DatePicker /></Field>
    </>,
  )
  expect(screen.getByRole('textbox', { name: 'Reason' })).toBeInvalid()
  expect(screen.getByRole('combobox', { name: 'Role' })).toBeInvalid()
  expect(screen.getByRole('combobox', { name: 'Due' })).toBeInvalid()
  expect(screen.getByRole('combobox', { name: 'Role' }).closest('.ui-select')).toHaveClass('ui-select--invalid')
})

test('a select that is not invalid has no error border', () => {
  render(<Select aria-label="Role" defaultValue=""><option value="">Choose…</option></Select>)
  expect(screen.getByRole('combobox').closest('.ui-select')).not.toHaveClass('ui-select--invalid')
})

test('FormError takes an id and shows nothing without a message', () => {
  const { rerender } = render(<FormError id="e" message="Bad." />)
  expect(screen.getByRole('alert')).toHaveAttribute('id', 'e')
  rerender(<FormError id="e" message="" />)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
