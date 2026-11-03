import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { Select } from './Select'

function Status({ onChange = jest.fn() }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState('todo')
  return (
    <label>
      Status
      <Select value={value} onChange={(e) => { setValue(e.target.value); onChange(e.target.value) }}>
        <option value="todo">To do</option>
        <option value="doing" disabled>Doing</option>
        <option value="done">Done</option>
      </Select>
    </label>
  )
}

const select = () => screen.getByRole('combobox', { name: 'Status' })
// The listbox's options (the hidden native select has its own).
const option = (name: string) => within(screen.getByRole('listbox')).getByRole('option', { name })

test('clicking the face opens a list of the options and picking one changes the value', () => {
  const onChange = jest.fn()
  render(<Status onChange={onChange} />)
  fireEvent.click(select().parentElement!)
  expect(select()).toHaveAttribute('aria-expanded', 'true')
  expect(option('To do')).toHaveAttribute('aria-selected', 'true')
  fireEvent.click(option('Done'))
  expect(onChange).toHaveBeenCalledWith('done')
  expect(select()).toHaveValue('done')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
})

test('the keyboard opens the list, skips disabled options and picks with Enter', () => {
  const onChange = jest.fn()
  render(<Status onChange={onChange} />)
  fireEvent.keyDown(select(), { key: 'ArrowDown' })
  expect(screen.getByRole('listbox')).toBeInTheDocument()
  fireEvent.keyDown(select(), { key: 'ArrowDown' })
  expect(select()).toHaveAttribute('aria-activedescendant', option('Done').id)
  fireEvent.keyDown(select(), { key: 'Enter' })
  expect(onChange).toHaveBeenCalledWith('done')
})

test('a disabled option cannot be picked and an uncontrolled select shows its default', () => {
  const onChange = jest.fn()
  render(
    <Select aria-label="Size" defaultValue="m" onChange={onChange}>
      <option value="s" disabled>Small</option>
      <option value="m">Medium</option>
    </Select>
  )
  const size = screen.getByRole('combobox', { name: 'Size' })
  expect(size).toHaveValue('m')
  fireEvent.keyDown(size, { key: ' ' })
  fireEvent.click(option('Small'))
  expect(onChange).not.toHaveBeenCalled()
})
