import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CardsView from './CardsView'
import type { Epic, Task } from '@/types'

const task = (id: number, extra: Partial<Task> = {}) => ({ id, title: `Task ${id}`, status: 'todo', parent_id: null, epic_id: null, due_date: null, document_id: 40 + id, ...extra }) as Task

test('shows a card per top-level task with status, epic, overdue date and subtask progress', () => {
  const tasks = [task(1, { epic_id: 7, due_date: '2000-01-02' }), task(2, { parent_id: 1, status: 'done' }), task(3, { status: 'done' })]
  render(<MemoryRouter><CardsView tasks={tasks} epics={[{ id: 7, title: 'Launch' } as Epic]} /></MemoryRouter>)
  expect(screen.getAllByRole('listitem')).toHaveLength(2)
  expect(screen.getByText('Launch')).toBeInTheDocument()
  expect(screen.getByText('Overdue · Jan 2')).toBeInTheDocument()
  expect(screen.getByText('1/1 subtasks')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Task 3/ })).toHaveAttribute('href', '/documents/43')
})

test('says so when the folder has no tasks', () => {
  render(<MemoryRouter><CardsView tasks={[]} epics={[]} /></MemoryRouter>)
  expect(screen.getByText(/No tasks yet/)).toBeInTheDocument()
})
