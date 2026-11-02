import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import type { Task, TaskField } from '@/types'
import { TaskFieldChips } from './TaskFieldChips'

const fields: TaskField[] = [
  { id: 1, name: 'Labels', field_type: 'tags', options: [] },
  { id: 2, name: 'Stage', field_type: 'dropdown', options: ['Draft', 'Final'] },
  { id: 3, name: 'Priority', field_type: 'rating', options: [] },
  { id: 4, name: 'Votes', field_type: 'vote', options: [] },
]
const task = (field_values: Task['field_values']) => ({ id: 9, title: 'Ship it', field_values }) as unknown as Task

test('shows a chip for each field the task has a value for', () => {
  render(<TaskFieldChips fields={fields} task={task({ '1': ['api', 'ui'], '2': 'Final', '3': 4, '4': [5, 6] })} />)
  expect(screen.getAllByRole('listitem')).toHaveLength(4)
  expect(screen.getByText('api, ui')).toBeInTheDocument()
  expect(screen.getByText('Final')).toBeInTheDocument()
  expect(screen.getByText('2 votes')).toBeInTheDocument()
})

test('a rating is also available to screen readers as words', () => {
  render(<TaskFieldChips fields={fields} task={task({ '3': 4 })} />)
  expect(screen.getByText('4 of 5 stars')).toBeInTheDocument()
  expect(screen.getByText('★★★★☆')).toHaveAttribute('aria-hidden', 'true')
})

test('shows nothing when the task has no values', () => {
  const { container } = render(<TaskFieldChips fields={fields} task={task({})} />)
  expect(container).toBeEmptyDOMElement()
})
