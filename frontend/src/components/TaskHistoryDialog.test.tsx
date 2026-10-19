import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import TaskHistoryDialog from './TaskHistoryDialog'

let mockChanges: unknown[]
jest.mock('@/api/tasks', () => ({ useTaskStatusChanges: () => ({ data: mockChanges, isLoading: false }) }))

test('lists each change with when and who', () => {
  mockChanges = [
    { id: 1, from_status: null, to_status: 'todo', changed_by_name: 'Pat', created_at: '2026-10-05T10:00:00Z' },
    { id: 2, from_status: 'todo', to_status: 'done', changed_by_name: null, created_at: '2026-10-06T10:00:00Z' },
  ]
  render(<TaskHistoryDialog task={{ id: 4, title: 'Ship' } as never} onClose={jest.fn()} />)
  expect(screen.getByText('History: Ship')).toBeInTheDocument()
  expect(screen.getByText(/Created as To Do/)).toBeInTheDocument()
  expect(screen.getByText(/To Do → Done/)).toBeInTheDocument()
  expect(screen.getByText(/· Pat/)).toBeInTheDocument()
})

test('says when there is no history', () => {
  mockChanges = []
  render(<TaskHistoryDialog task={{ id: 4, title: 'Old' } as never} onClose={jest.fn()} />)
  expect(screen.getByText(/No recorded changes/)).toBeInTheDocument()
})
