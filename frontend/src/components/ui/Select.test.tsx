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

test('an option can carry a hint, shown at the end of its entry in the list and not on the face', () => {
  const { container } = render(
    <Select defaultValue="a">
      <option value="a" data-hint="⌘⌥7">Title</option>
      <option value="b">Body</option>
    </Select>
  )
  expect(container.querySelector('.ui-select-value')).not.toHaveTextContent('⌘')
  fireEvent.click(container.querySelector('.ui-select') as HTMLElement)
  const list = within(screen.getByRole('listbox'))
  expect(within(list.getByRole('option', { name: 'Title' })).getByText('⌘⌥7')).toBeInTheDocument()
  expect(within(list.getByRole('option', { name: 'Body' })).queryByText('⌘⌥7')).not.toBeInTheDocument()
})

describe('naming and groups', () => {
  const open = (container: HTMLElement) => fireEvent.click(container.querySelector('.ui-select') as HTMLElement)

  test('the open list takes the select\'s aria-label', () => {
    const { container } = render(<Select aria-label="Status" defaultValue="a"><option value="a">A</option></Select>)
    open(container)
    expect(screen.getByRole('listbox', { name: 'Status' })).toBeInTheDocument()
  })

  test('the open list follows aria-labelledby', () => {
    const { container } = render(<><span id="who">Assignee</span><Select aria-labelledby="who" defaultValue="a"><option value="a">A</option></Select></>)
    open(container)
    expect(screen.getByRole('listbox', { name: 'Assignee' })).toBeInTheDocument()
  })

  test('otherwise it is named by the select\'s label', () => {
    const { container } = render(<><label htmlFor="s1">Priority</label><Select id="s1" defaultValue="a"><option value="a">High</option></Select></>)
    open(container)
    expect(screen.getByRole('listbox', { name: 'Priority' })).toBeInTheDocument()
  })

  test('a wrapping label names it without the option texts', () => {
    const { container } = render(<label>Team <Select defaultValue="a"><option value="a">Alpha</option><option value="b">Beta</option></Select></label>)
    open(container)
    expect(screen.getByRole('listbox')).toHaveAccessibleName('Team')
  })

  test('optgroup labels are headings above their options, skipped by the keyboard', () => {
    const onChange = jest.fn()
    const { container } = render(
      <Select aria-label="Style" defaultValue="t" onChange={onChange}>
        <option value="t">Title</option>
        <optgroup label="My styles">
          <option value="c1">Callout</option>
          <option value="c2">Warning</option>
        </optgroup>
      </Select>,
    )
    open(container)
    const group = within(screen.getByRole('listbox')).getByRole('group', { name: 'My styles' })
    expect(within(group).getAllByRole('option').map((o) => o.textContent)).toEqual(['Callout', 'Warning'])
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(3)
    const select = container.querySelector('select') as HTMLSelectElement
    fireEvent.keyDown(select, { key: 'ArrowDown' })
    fireEvent.keyDown(select, { key: 'Enter' })
    expect(onChange).toHaveBeenCalled()
    expect(select.value).toBe('c1')
  })

  test('options outside a group have no heading', () => {
    const { container } = render(<Select aria-label="Plain" defaultValue="a"><option value="a">A</option></Select>)
    open(container)
    expect(within(screen.getByRole('listbox')).queryByRole('group')).not.toBeInTheDocument()
  })

  test('multiple is not supported and says so', () => {
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<Select aria-label="Many" multiple><option>A</option></Select>)).toThrow('does not support `multiple`')
    quiet.mockRestore()
  })
})
