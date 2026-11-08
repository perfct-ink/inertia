import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import FieldCell from './FieldCell'
import type { CellValue, TableField } from '@/api/tables'

jest.mock('@/lib/api', () => ({ __esModule: true, default: { defaults: { baseURL: 'http://api.test' } } }))

const field = (data_type: TableField['data_type'], extra: Partial<TableField> = {}): TableField =>
  ({ id: 1, name: 'Thing', data_type, relation_table_id: null, ...extra })

const none = { relations: new Map(), files: [], people: [] }

// A cell with the state a record row gives it, so typing and leaving the cell can be followed through.
function Cell({ f, start = null, people = [], onValue }: { f: TableField; start?: CellValue; people?: { id: number; name: string }[]; onValue?: (v: CellValue) => void }) {
  const [value, setValue] = useState<CellValue>(start)
  return <FieldCell field={f} value={value} {...none} people={people} onChange={(v) => { setValue(v); onValue?.(v) }} />
}

test('money shows in its format, the plain amount while it is being edited, and stores a number', () => {
  const onValue = jest.fn()
  render(<Cell f={field('money', { display_format: 'eur' })} start={1250} onValue={onValue} />)
  const input = screen.getByLabelText('Thing')
  expect(input).toHaveValue('€1,250.00')
  fireEvent.focus(input)
  expect(input).toHaveValue('1250')
  fireEvent.change(input, { target: { value: '$1,300.5' } })
  expect(input).toHaveValue('$1,300.5')
  expect(onValue).toHaveBeenLastCalledWith(1300.5)
  fireEvent.blur(input)
  expect(input).toHaveValue('€1,300.50')
  fireEvent.change(input, { target: { value: '' } })
  expect(onValue).toHaveBeenLastCalledWith(null)
})

test('a phone is stored as digits and shown in the field format', () => {
  const onValue = jest.fn()
  render(<Cell f={field('phone', { display_format: 'dashes' })} start="5551234567" onValue={onValue} />)
  const input = screen.getByLabelText('Thing')
  expect(input).toHaveValue('555-123-4567')
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: '(555) 987-6543' } })
  expect(onValue).toHaveBeenLastCalledWith('5559876543')
  fireEvent.blur(input)
  expect(input).toHaveValue('555-987-6543')
})

test('an integer with commas reads typed commas and shows them', () => {
  const onValue = jest.fn()
  render(<Cell f={field('integer', { display_format: 'commas' })} start={1234} onValue={onValue} />)
  const input = screen.getByLabelText('Thing')
  expect(input).toHaveValue('1,234')
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: '12,345' } })
  expect(onValue).toHaveBeenLastCalledWith(12345)
})

test('a plain integer or year is a number input that clears when emptied', () => {
  const onValue = jest.fn()
  render(<Cell f={field('year')} start={2026} onValue={onValue} />)
  const input = screen.getByLabelText('Thing')
  expect(input).toHaveAttribute('type', 'number')
  expect(input).toHaveAttribute('min', '1000')
  fireEvent.change(input, { target: { value: '1999' } })
  expect(onValue).toHaveBeenLastCalledWith(1999)
  fireEvent.change(input, { target: { value: '' } })
  expect(onValue).toHaveBeenLastCalledWith(null)
})

test('a typed value that does not fit is marked invalid', () => {
  const { rerender } = render(<FieldCell field={field('email')} value="ada@" invalid {...none} onChange={jest.fn()} />)
  expect(screen.getByLabelText('Thing')).toHaveAttribute('aria-invalid', 'true')
  rerender(<FieldCell field={field('email')} value="ada@example.com" {...none} onChange={jest.fn()} />)
  expect(screen.getByLabelText('Thing')).not.toHaveAttribute('aria-invalid')
})

test('a color shows a swatch and is stored as lower case hex', () => {
  const onValue = jest.fn()
  render(<Cell f={field('color')} start="#0d9488" onValue={onValue} />)
  const input = screen.getByLabelText('Thing')
  expect(input).toHaveValue('#0d9488')
  fireEvent.change(input, { target: { value: '0D9488' } })
  expect(onValue).toHaveBeenLastCalledWith('#0d9488')
})

test('a rating is five stars, or a number menu in the number format', () => {
  const onValue = jest.fn()
  const { unmount } = render(<Cell f={field('rating')} start={2} onValue={onValue} />)
  fireEvent.click(screen.getByRole('button', { name: '4 stars' }))
  expect(onValue).toHaveBeenLastCalledWith(4)
  unmount()
  render(<Cell f={field('rating', { display_format: 'number' })} start={2} onValue={onValue} />)
  expect(screen.getByLabelText('Thing')).toHaveValue('2')
  fireEvent.change(screen.getByLabelText('Thing'), { target: { value: '5' } })
  expect(onValue).toHaveBeenLastCalledWith(5)
  fireEvent.change(screen.getByLabelText('Thing'), { target: { value: '' } })
  expect(onValue).toHaveBeenLastCalledWith(null)
})

test('a month is chosen from names, written in the field format', () => {
  const onValue = jest.fn()
  render(<Cell f={field('month', { display_format: 'short' })} start={3} onValue={onValue} />)
  const select = screen.getByLabelText('Thing')
  expect(select).toHaveValue('3')
  expect(screen.getByRole('option', { name: 'Mar' })).toBeInTheDocument()
  fireEvent.change(select, { target: { value: '12' } })
  expect(onValue).toHaveBeenLastCalledWith(12)
})

test('a single select offers the field choices and can be emptied', () => {
  const onValue = jest.fn()
  render(<Cell f={field('single_select', { options: ['Open', 'Done'] })} start="Open" onValue={onValue} />)
  const select = screen.getByLabelText('Thing')
  expect(select).toHaveValue('Open')
  fireEvent.change(select, { target: { value: 'Done' } })
  expect(onValue).toHaveBeenLastCalledWith('Done')
  fireEvent.change(select, { target: { value: '' } })
  expect(onValue).toHaveBeenLastCalledWith(null)
})

test('a multi select is a list of checkboxes, kept in the order of the choices', () => {
  const onValue = jest.fn()
  render(<Cell f={field('multi_select', { options: ['Bug', 'Feature', 'Docs'] })} start={['Docs']} onValue={onValue} />)
  expect(screen.getByText('Docs', { selector: 'summary' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Bug' }))
  expect(onValue).toHaveBeenLastCalledWith(['Bug', 'Docs'])
  fireEvent.click(screen.getByRole('checkbox', { name: 'Docs' }))
  expect(onValue).toHaveBeenLastCalledWith(['Bug'])
  fireEvent.click(screen.getByRole('checkbox', { name: 'Bug' }))
  expect(onValue).toHaveBeenLastCalledWith(null)
})

test('a person is chosen from the Space members, and a member who left is still named', () => {
  const onValue = jest.fn()
  const people = [{ id: 7, name: 'Ada Lovelace' }, { id: 8, name: 'Grace Hopper' }]
  const { unmount } = render(<Cell f={field('person')} start={7} people={people} onValue={onValue} />)
  expect(screen.getByLabelText('Thing')).toHaveValue('7')
  fireEvent.change(screen.getByLabelText('Thing'), { target: { value: '8' } })
  expect(onValue).toHaveBeenLastCalledWith(8)
  fireEvent.change(screen.getByLabelText('Thing'), { target: { value: '' } })
  expect(onValue).toHaveBeenLastCalledWith(null)
  unmount()
  render(<Cell f={field('person')} start={9} people={people} />)
  expect(screen.getByRole('option', { name: 'Member #9' })).toBeInTheDocument()
})

test('an auto-number, created time and updated time are shown, never edited', () => {
  const { unmount } = render(<FieldCell field={field('auto_number', { display_format: 'padded' })} value={7} {...none} onChange={jest.fn()} />)
  expect(screen.getByLabelText('Thing')).toHaveTextContent('0007')
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  unmount()
  const { unmount: unmountTime } = render(<FieldCell field={field('created_time')} value="2026-11-07T14:30:00Z" {...none} onChange={jest.fn()} />)
  expect(screen.getByLabelText('Thing')).toHaveTextContent('2026-11-07 14:30')
  unmountTime()
  render(<FieldCell field={field('updated_time')} value={undefined} {...none} onChange={jest.fn()} />)
  expect(screen.getByLabelText('Thing')).toHaveTextContent('Automatic')
})

test('long text is a text area and a date opens the date picker', () => {
  const onValue = jest.fn()
  const { unmount } = render(<Cell f={field('long_text')} start="one" onValue={onValue} />)
  fireEvent.change(screen.getByLabelText('Thing'), { target: { value: 'one\ntwo' } })
  expect(onValue).toHaveBeenLastCalledWith('one\ntwo')
  expect(screen.getByLabelText('Thing').tagName).toBe('TEXTAREA')
  unmount()
  render(<Cell f={field('date')} start="2026-11-07" onValue={onValue} />)
  expect(screen.getByLabelText('Thing')).toHaveAttribute('role', 'combobox')
  expect(screen.getByLabelText('Thing')).toHaveValue('2026-11-07')
})
