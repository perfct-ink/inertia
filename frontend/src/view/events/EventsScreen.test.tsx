import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import EventsScreen from './EventsScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
const mockCreate = { mutate: jest.fn(), isPending: false }
const mockRemoveTask = { mutate: jest.fn() }
const mockEvent = {
  id: 4, title: 'Beta launch', description: null, date: '2999-01-15', start_time: null, end_time: null,
  event_type: 'milestone', folder_id: null, created_at: '', updated_at: '',
  tasks: [{ id: 9, title: 'Write copy', status: 'todo', document_id: null, folder_id: null }],
}
jest.mock('@/api/events', () => ({
  useEvents: () => ({ data: [mockEvent], isLoading: false }),
  useCreateEvent: () => mockCreate,
  useDeleteEvent: () => ({ mutate: jest.fn() }),
  useAddTaskToEvent: () => ({ mutate: jest.fn() }),
  useRemoveTaskFromEvent: () => mockRemoveTask,
}))
jest.mock('@/api/tasks', () => ({ useTasks: () => ({ data: [] }) }))
jest.mock('@/hooks/useBoardStatuses', () => ({
  useStatusesForFolder: () => () => ({ todo: { label: 'To do', color: '#888' } }),
}))

afterEach(() => jest.clearAllMocks())

function Where() {
  return <p data-testid="where">{useLocation().search}</p>
}

function renderScreen(path = '/events') {
  render(<MemoryRouter initialEntries={[path]}><EventsScreen /><Where /></MemoryRouter>)
}

test('the list and month tabs show which view is open and navigate to the other', () => {
  renderScreen()
  expect(screen.getByRole('group', { name: 'View' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Month' })).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(screen.getByRole('button', { name: 'Month' }))
  expect(screen.getByTestId('where')).toHaveTextContent('?view=month')
})

test('the month view steps between months', () => {
  renderScreen('/events?view=month')
  const label = document.querySelector('.events-month-label') as HTMLElement
  const before = label.textContent
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
  expect(label.textContent).not.toBe(before)
  fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
  expect(label.textContent).toBe(before)
  fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
  fireEvent.click(screen.getByRole('button', { name: 'Today' }))
  expect(label.textContent).toBe(before)
})

test('the type choice in the new event form switches without submitting the form', () => {
  renderScreen()
  fireEvent.click(screen.getByRole('button', { name: /New event/ }))
  const milestone = screen.getByRole('button', { name: /Milestone/ })
  const deadline = screen.getByRole('button', { name: /Deadline/ })
  expect(screen.getByRole('group', { name: 'Type' })).toBeInTheDocument()
  expect(milestone).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(deadline)
  expect(deadline).toHaveAttribute('aria-pressed', 'true')
  expect(milestone).toHaveAttribute('aria-pressed', 'false')
  expect(mockCreate.mutate).not.toHaveBeenCalled()
})

test('an open event can have a task removed and be closed', () => {
  renderScreen()
  fireEvent.click(screen.getByRole('button', { name: /Beta launch/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Remove task' }))
  expect(mockRemoveTask.mutate).toHaveBeenCalledWith({ eventId: 4, taskId: 9 })
  expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
})
