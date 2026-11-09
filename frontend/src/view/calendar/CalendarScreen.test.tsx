import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { format } from 'date-fns'
import { MemoryRouter } from 'react-router-dom'
import CalendarScreen from './CalendarScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
const today = format(new Date(), 'yyyy-MM-dd')
jest.mock('@/api/tasks', () => ({
  useTasks: () => ({
    data: [{ id: 1, title: 'Ship it', due_date: new Date().toLocaleDateString('en-CA'), status: 'todo' }, { id: 2, title: 'Finished', due_date: new Date().toLocaleDateString('en-CA'), status: 'done' }],
    isLoading: false,
  }),
}))
jest.mock('@/api/events', () => ({ useEvents: () => ({ data: [{ id: 5, title: 'Launch party', date: new Date().toLocaleDateString('en-CA') }] }) }))
const mockUpdate = { mutate: jest.fn(), isPending: false }
const mockDelete = { mutate: jest.fn(), isPending: false }
const day = () => new Date().toLocaleDateString('en-CA')
jest.mock('@/api/documentDates', () => ({
  useDocumentDates: () => ({
    data: [
      { id: 3, date: day(), label: 'Ship the beta', document_id: 9, document_title: 'Launch plan' },
      { id: 4, date: day(), label: 'Kept date', document_id: null, document_title: null },
    ],
  }),
  useUpdateDocumentDate: () => mockUpdate,
  useDeleteDocumentDate: () => mockDelete,
}))

const renderCalendar = () => render(<MemoryRouter><CalendarScreen /></MemoryRouter>)

afterEach(() => jest.clearAllMocks())

test('shows tasks on their due date and events on their date, in the grid and the phone agenda', () => {
  renderCalendar()
  expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(screen.getAllByText('Ship it')).toHaveLength(2)
  expect(screen.getAllByText('Launch party')).toHaveLength(2)
  expect(screen.getAllByText('Finished')[0].className).toContain('calendar-chip--done')
})

test('tasks, events and dates can be hidden independently', () => {
  renderCalendar()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Tasks' }))
  expect(screen.queryByText('Ship it')).not.toBeInTheDocument()
  expect(screen.getAllByText('Launch party')).toHaveLength(2)
  fireEvent.click(screen.getByRole('checkbox', { name: 'Events' }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Dates' }))
  expect(screen.getByText('Nothing this month')).toBeInTheDocument()
})

test('month navigation moves to the next month', () => {
  renderCalendar()
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
  expect(screen.queryByText('Ship it')).not.toBeInTheDocument()
})

test('dates from documents link to their chip, except one kept after its line was deleted', () => {
  renderCalendar()
  const [link] = screen.getAllByRole('link', { name: /Ship the beta/ })
  expect(link).toHaveAttribute('href', '/documents/9#date%3D3')
  expect(screen.queryByRole('link', { name: /Kept date/ })).toBeNull()
  expect(screen.getAllByText('Kept date')).toHaveLength(2)
})

test('dates can be hidden on their own', () => {
  renderCalendar()
  fireEvent.click(screen.getByRole('checkbox', { name: 'Dates' }))
  expect(screen.queryByText('Ship the beta')).not.toBeInTheDocument()
  expect(screen.getAllByText('Ship it')).toHaveLength(2)
})

test('changing a date on the calendar saves the new day and label', () => {
  renderCalendar()
  fireEvent.click(screen.getAllByRole('button', { name: 'Edit Ship the beta' })[0])
  expect(screen.getByRole('dialog', { name: 'Edit date' })).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-12-15' } })
  fireEvent.change(screen.getByLabelText('Label'), { target: { value: ' Public beta ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 3, date: '2026-12-15', label: 'Public beta' }, expect.anything())
})

test('a date can be deleted from the calendar', () => {
  renderCalendar()
  fireEvent.click(screen.getAllByRole('button', { name: 'Edit Kept date' })[0])
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
  expect(mockDelete.mutate).toHaveBeenCalledWith(4, expect.anything())
})
