import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { addDays, format } from 'date-fns'
import DocumentPlanningSummary from './DocumentPlanningSummary'

const day = (n: number) => format(addDays(new Date(), n), 'yyyy-MM-dd')
let mockTasks: unknown[]
let mockInitiatives: unknown[]
jest.mock('@/api/tasks', () => ({ useTasks: () => ({ data: mockTasks }) }))
jest.mock('@/api/initiatives', () => ({ useInitiatives: () => ({ data: mockInitiatives }) }))
jest.mock('@/api/events', () => ({
  useEvents: () => ({ data: [{ id: 1, title: 'Launch', date: format(addDays(new Date(), 3), 'yyyy-MM-dd'), folder_id: 5 }, { id: 2, title: 'Elsewhere', date: format(addDays(new Date(), 3), 'yyyy-MM-dd'), folder_id: 9 }] }),
}))

const doc = { id: 1, folder_id: 5, initiative_id: 3 } as never

test('shows the initiative, task progress with overdue count, and this folder\'s next events', () => {
  mockTasks = [{ status: 'done', due_date: day(-5) }, { status: 'todo', due_date: day(-1) }, { status: 'todo', due_date: day(4) }]
  mockInitiatives = [{ id: 3, title: 'Onboarding', health: 'at_risk', start_date: '2026-11-01', target_date: '2026-12-01' }]
  render(<DocumentPlanningSummary doc={doc} />)
  expect(screen.getByText('Onboarding')).toBeInTheDocument()
  expect(screen.getByText('At risk')).toBeInTheDocument()
  expect(screen.getByText('1/3 tasks done')).toBeInTheDocument()
  expect(screen.getByText('1 overdue')).toBeInTheDocument()
  expect(screen.getByText(/Launch ·/)).toBeInTheDocument()
  expect(screen.queryByText(/Elsewhere/)).not.toBeInTheDocument()
})

test('a document with no plan shows nothing', () => {
  mockTasks = []
  mockInitiatives = []
  const { container } = render(<DocumentPlanningSummary doc={{ id: 1, folder_id: 7, initiative_id: null } as never} />)
  expect(container).toBeEmptyDOMElement()
})
