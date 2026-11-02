import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Task, TaskField } from '@/types'
import { TaskFieldInput } from './TaskFieldInput'

const field = (field_type: TaskField['field_type'], options: string[] = []): TaskField => ({ id: 1, name: 'Field', field_type, options })
const task = (value?: unknown) => ({ id: 9, title: 'Ship it', field_values: value === undefined ? {} : { '1': value } }) as unknown as Task

function setup(f: TaskField, t: Task, userId: number | null = 5) {
  const onChange = jest.fn()
  const onVote = jest.fn()
  render(<TaskFieldInput field={f} task={t} userId={userId} onChange={onChange} onVote={onVote} />)
  return { onChange, onVote }
}

test('tags: Enter adds the typed tags, skipping repeats, and a tag can be removed', () => {
  const { onChange } = setup(field('tags'), task(['api']))
  const input = screen.getByLabelText('Add a tag to Field')
  fireEvent.change(input, { target: { value: 'ui, API' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(onChange).toHaveBeenLastCalledWith(['api', 'ui'])
  expect(input).toHaveValue('')

  fireEvent.click(screen.getByRole('button', { name: 'Remove tag api' }))
  expect(onChange).toHaveBeenLastCalledWith([])
})

test('tags: an empty draft saves nothing', () => {
  const { onChange } = setup(field('tags'), task())
  const input = screen.getByLabelText('Add a tag to Field')
  fireEvent.keyDown(input, { key: 'Enter' })
  fireEvent.blur(input)
  expect(onChange).not.toHaveBeenCalled()
  expect(screen.queryByRole('list')).not.toBeInTheDocument()
})

test('dropdown: offers the choices and None clears the value', () => {
  const { onChange } = setup(field('dropdown', ['Draft', 'Final']), task('Draft'))
  const select = screen.getByLabelText('Field')
  expect(select).toHaveValue('Draft')
  expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['None', 'Draft', 'Final'])
  fireEvent.change(select, { target: { value: 'Final' } })
  expect(onChange).toHaveBeenLastCalledWith('Final')
  fireEvent.change(select, { target: { value: '' } })
  expect(onChange).toHaveBeenLastCalledWith(null)
})

test('checkbox: checking saves true and unchecking clears', () => {
  const { onChange } = setup(field('checkbox'), task(true))
  const box = screen.getByRole('checkbox', { name: 'Field' })
  expect(box).toBeChecked()
  fireEvent.click(box)
  expect(onChange).toHaveBeenLastCalledWith(null)
})

test('rating: a star sets the rating, the same star again or Clear removes it', () => {
  const { onChange } = setup(field('rating'), task(3))
  expect(screen.getByRole('button', { name: '3 stars' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: '4 stars' })).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(screen.getByRole('button', { name: '4 stars' }))
  expect(onChange).toHaveBeenLastCalledWith(4)
  fireEvent.click(screen.getByRole('button', { name: '3 stars' }))
  expect(onChange).toHaveBeenLastCalledWith(null)
  fireEvent.click(screen.getByRole('button', { name: 'Clear Field' }))
  expect(onChange).toHaveBeenLastCalledWith(null)
})

test('rating: no Clear button until there is a rating', () => {
  setup(field('rating'), task())
  expect(screen.queryByRole('button', { name: 'Clear Field' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '1 star' })).toBeInTheDocument()
})

test('vote: casts your vote, or takes it back when you already voted', () => {
  const first = setup(field('vote'), task([8]))
  const vote = screen.getByRole('button', { name: 'Vote on Field, 1 vote' })
  expect(vote).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(vote)
  expect(first.onVote).toHaveBeenLastCalledWith(true)
})

test('vote: shows that you voted', () => {
  const { onVote } = setup(field('vote'), task([5, 8]))
  const vote = screen.getByRole('button', { name: 'Take back your vote on Field, 2 votes' })
  expect(vote).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(vote)
  expect(onVote).toHaveBeenLastCalledWith(false)
})

describe('text, number and date fields', () => {
  test('text: typing saves nothing until the box loses focus', () => {
    const { onChange } = setup(field('text'), task('old'))
    const box = screen.getByLabelText('Field')
    expect(box).toHaveValue('old')
    fireEvent.change(box, { target: { value: 'new' } })
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.blur(box)
    expect(onChange).toHaveBeenCalledWith('new')
  })

  test('Enter saves, and an unchanged value saves nothing', () => {
    const { onChange } = setup(field('integer'), task(3))
    const box = screen.getByLabelText('Field')
    expect(box).toHaveAttribute('type', 'number')
    fireEvent.blur(box)
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.change(box, { target: { value: '5' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith(5)
  })

  test('emptying the box clears the value, and zero is a value', () => {
    const { onChange } = setup(field('integer'), task(3))
    const box = screen.getByLabelText('Field')
    fireEvent.change(box, { target: { value: '' } })
    fireEvent.blur(box)
    expect(onChange).toHaveBeenLastCalledWith(null)
    fireEvent.change(box, { target: { value: '0' } })
    fireEvent.blur(box)
    expect(onChange).toHaveBeenLastCalledWith(0)
  })

  test('text that does not fit shows why and is not saved', () => {
    const { onChange } = setup(field('integer'), task())
    const box = screen.getByLabelText('Field')
    fireEvent.change(box, { target: { value: '2.5' } })
    fireEvent.blur(box)
    expect(screen.getByRole('alert')).toHaveTextContent('Field must be a whole number')
    expect(box).toHaveAttribute('aria-invalid', 'true')
    expect(onChange).not.toHaveBeenCalled()
  })

  test('a date uses the date picker and sends the day', () => {
    const { onChange } = setup(field('date'), task('2026-10-04'))
    const box = screen.getByLabelText('Field')
    expect(box).toHaveAttribute('type', 'date')
    fireEvent.change(box, { target: { value: '2026-10-05' } })
    fireEvent.blur(box)
    expect(onChange).toHaveBeenCalledWith('2026-10-05')
  })

  test('a date and time is shown and sent in UTC', () => {
    const { onChange } = setup(field('datetime'), task('2026-10-04T12:30:00+02:00'))
    const box = screen.getByLabelText('Field')
    expect(box).toHaveAttribute('type', 'datetime-local')
    expect(box).toHaveValue('2026-10-04T10:30')
    fireEvent.change(box, { target: { value: '2026-10-04T11:00' } })
    fireEvent.blur(box)
    expect(onChange).toHaveBeenCalledWith('2026-10-04T11:00:00Z')
  })

  test('the box follows the saved value when it changes', () => {
    const f = field('text')
    const { rerender } = render(<TaskFieldInput field={f} task={task('a')} userId={5} onChange={jest.fn()} onVote={jest.fn()} />)
    rerender(<TaskFieldInput field={f} task={task('b')} userId={5} onChange={jest.fn()} onVote={jest.fn()} />)
    expect(screen.getByLabelText('Field')).toHaveValue('b')
  })
})
