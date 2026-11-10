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

// ── Collection field types ──

test('a money field reads what is typed and saves the plain number when it loses focus', () => {
  const { onChange } = setup({ ...field('money'), name: 'Cost', display_format: 'usd' }, task())
  const input = screen.getByRole('textbox', { name: 'Cost' })
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: '$1,250' } })
  expect(onChange).not.toHaveBeenCalled()
  fireEvent.blur(input)
  expect(onChange).toHaveBeenCalledWith(1250)
})

test('a value that does not fit is shown as a problem and not saved', () => {
  const { onChange } = setup({ ...field('email'), name: 'Contact' }, task())
  const input = screen.getByRole('textbox', { name: 'Contact' })
  fireEvent.change(input, { target: { value: 'not an email' } })
  fireEvent.blur(input)
  expect(onChange).not.toHaveBeenCalled()
  expect(screen.getByText(/Contact/, { selector: '.ui-form_error, [role="alert"]' })).toBeInTheDocument()
})

test('a single select saves the choice at once, and clearing it saves null', () => {
  const { onChange } = setup({ ...field('single_select', ['Open', 'Done']), name: 'Stage' }, task('Open'))
  fireEvent.change(screen.getByRole('combobox', { name: 'Stage' }), { target: { value: 'Done' } })
  expect(onChange).toHaveBeenCalledWith('Done')
})

test('a formula field shows its result and has nothing to type into', () => {
  render(<TaskFieldInput field={{ ...field('formula'), name: 'Double', formula: '{A} * 2' }} task={task()} userId={5} onChange={jest.fn()} onVote={jest.fn()} formula={{ value: 8 }} />)
  expect(screen.getByRole('status', { name: 'Double' })).toHaveTextContent('8')
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
})
