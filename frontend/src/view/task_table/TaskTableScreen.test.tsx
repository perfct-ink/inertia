import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import TaskTableScreen from './TaskTableScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
const mockUpdate = { mutate: jest.fn() }
jest.mock('@/components/SavedViews', () => function SavedViewsMock() { return null })
jest.mock('@/api/tasks', () => ({
  useTasks: () => ({
    data: [
      { id: 1, title: 'Write spec', status: 'todo', start_date: null, due_date: '2026-11-09', assignee_id: null, epic_id: null, sprint_id: null },
      { id: 2, title: 'Ship', status: 'done', start_date: null, due_date: '2026-11-01', assignee_id: 7, epic_id: 1, sprint_id: null },
    ],
    isLoading: false,
  }),
  useUpdateTask: () => mockUpdate,
}))
jest.mock('@/api/epics', () => ({ useEpics: () => ({ data: [{ id: 1, title: 'Onboarding' }] }) }))
jest.mock('@/api/sprints', () => ({ useSprints: () => ({ data: [] }) }))
jest.mock('@/api/workspaces', () => ({ useWorkspaceMembers: () => ({ data: [{ user_id: 7, user: { name: 'Sam' } }] }) }))

afterEach(() => jest.clearAllMocks())

const titles = () => screen.getAllByRole('textbox').map((i) => (i as HTMLInputElement).defaultValue).filter(Boolean)

test('edits status, date, assignee and title in place', () => {
  render(<TaskTableScreen />)
  fireEvent.change(screen.getByLabelText('Status of Write spec'), { target: { value: 'in_progress' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 1, status: 'in_progress' })
  fireEvent.change(screen.getByLabelText('Due date of Write spec'), { target: { value: '2026-12-01' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 1, due_date: '2026-12-01' })
  fireEvent.change(screen.getByLabelText('Assignee of Write spec'), { target: { value: '7' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 1, assignee_id: 7 })
  const title = screen.getByLabelText('Title of Write spec')
  fireEvent.change(title, { target: { value: 'Write the spec' } })
  fireEvent.blur(title)
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 1, title: 'Write the spec' })
})

test('a blank title is not saved', () => {
  render(<TaskTableScreen />)
  const title = screen.getByLabelText('Title of Ship')
  fireEvent.change(title, { target: { value: '  ' } })
  fireEvent.blur(title)
  expect(mockUpdate.mutate).not.toHaveBeenCalled()
})

test('sorts by a clicked column, filters, groups and hides columns', () => {
  render(<TaskTableScreen />)
  expect(titles()).toEqual(['Ship', 'Write spec'])   // default sort: due date ascending
  fireEvent.click(screen.getByRole('button', { name: 'Due' }))
  expect(titles()).toEqual(['Write spec', 'Ship'])

  fireEvent.change(screen.getByLabelText('Filter tasks'), { target: { value: 'ship' } })
  expect(titles()).toEqual(['Ship'])
  fireEvent.change(screen.getByLabelText('Filter tasks'), { target: { value: '' } })

  fireEvent.change(screen.getByLabelText('Group by'), { target: { value: 'status' } })
  expect(screen.getByRole('heading', { name: /To Do/ })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /Done/ })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('checkbox', { name: 'Epic' }))
  expect(screen.queryByLabelText('Epic of Ship')).not.toBeInTheDocument()
})
