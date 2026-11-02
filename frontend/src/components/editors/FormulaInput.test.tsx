import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import FormulaInput from './FormulaInput'

const fields = [{ id: 1, name: 'Price', data_type: 'number' }, { id: 2, name: 'Unit cost', data_type: 'number' }]

function setup(props: Partial<React.ComponentProps<typeof FormulaInput>> = {}) {
  const onChange = jest.fn()
  render(<FormulaInput value="{Price} + " onChange={onChange} onBlur={jest.fn()} fields={fields} problem={null} showProblem={false} {...props} />)
  return onChange
}

test('picking a field adds it to the formula in braces', () => {
  const onChange = setup()
  fireEvent.change(screen.getByLabelText('Insert field'), { target: { value: 'Unit cost' } })
  expect(onChange).toHaveBeenCalledWith('{Price} + {Unit cost}')
})

test('typing sends the new formula', () => {
  const onChange = setup()
  fireEvent.change(screen.getByLabelText('Formula'), { target: { value: '1' } })
  expect(onChange).toHaveBeenCalledWith('1')
})

test('describes the syntax and the available functions', () => {
  setup()
  expect(screen.getByLabelText('Formula')).toHaveAccessibleDescription(/Refer to a field as \{Field name\}.*ROUND/)
})

test('the problem is only shown once it should be', () => {
  setup({ problem: 'The formula ends too early' })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('a shown problem is announced and marks the box invalid', () => {
  setup({ problem: 'The formula ends too early', showProblem: true })
  expect(screen.getByRole('alert')).toHaveTextContent('The formula ends too early')
  expect(screen.getByLabelText('Formula')).toBeInvalid()
})

test('there is no field picker when there are no other fields', () => {
  setup({ fields: [] })
  expect(screen.queryByLabelText('Insert field')).not.toBeInTheDocument()
})
