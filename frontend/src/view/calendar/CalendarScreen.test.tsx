import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { format } from 'date-fns'
import CalendarScreen from './CalendarScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
const today = format(new Date(), 'yyyy-MM-dd')
jest.mock('@/api/tasks', () => ({
  useTasks: () => ({
    data: [{ id: 1, title: 'Ship it', due_date: format(new Date(), 'yyyy-MM-dd'), status: 'todo' }, { id: 2, title: 'Finished', due_date: format(new Date(), 'yyyy-MM-dd'), status: 'done' }],
    isLoading: false,
  }),
}))
jest.mock('@/api/events', () => ({ useEvents: () => ({ data: [{ id: 5, title: 'Launch party', date: format(new Date(), 'yyyy-MM-dd') }] }) }))

test('shows tasks on their due date and events on their date, in the grid and the phone agenda', () => {
  render(<CalendarScreen />)
  expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(screen.getAllByText('Ship it')).toHaveLength(2)
  expect(screen.getAllByText('Launch party')).toHaveLength(2)
  expect(screen.getAllByText('Finished')[0].className).toContain('calendar-chip--done')
})

test('tasks and events can be hidden independently', () => {
  render(<CalendarScreen />)
  fireEvent.click(screen.getByRole('checkbox', { name: 'Tasks' }))
  expect(screen.queryByText('Ship it')).not.toBeInTheDocument()
  expect(screen.getAllByText('Launch party')).toHaveLength(2)
  fireEvent.click(screen.getByRole('checkbox', { name: 'Events' }))
  expect(screen.getByText('Nothing this month')).toBeInTheDocument()
})

test('month navigation moves to the next month', () => {
  render(<CalendarScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
  expect(screen.queryByText('Ship it')).not.toBeInTheDocument()
})
