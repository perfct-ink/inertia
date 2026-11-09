import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TasksScreen from './TasksScreen'
import type { TaskStatusSetting } from '@/types'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
// Dragging is not under test; these stand in for dnd-kit so the board renders in jsdom.
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PointerSensor: class {},
  MouseSensor: class {},
  useSensor: () => ({}),
  useSensors: () => [],
  closestCorners: () => [],
  useDroppable: () => ({ setNodeRef: jest.fn() }),
}))
jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSortable: () => ({ setNodeRef: jest.fn(), transform: null, transition: undefined, isDragging: false }),
  verticalListSortingStrategy: {},
  arrayMove: (items: unknown[]) => items,
}))
jest.mock('@dnd-kit/utilities', () => ({ CSS: { Transform: { toString: () => undefined } } }))

const mockMutation = { mutate: jest.fn(), isPending: false }
let mockRole = 'member'
const mockWorkspace = {
  name: 'Personal',
  get role() { return mockRole },
  folders: [{ id: 1, name: 'Root', root: true, parent_id: null, documents: [], children: [{ id: 2, name: 'Messages', root: false, parent_id: 1, documents: [], children: [] }] }],
}
const mockTasks = [
  { id: 1, title: 'Write copy', status: 'todo', epic_id: null, document_id: 1, folder_id: 2 },
  { id: 2, title: 'Old idea', status: 'backlog', epic_id: null, document_id: 1, folder_id: 2 },
]
let mockTasksRenders = 0
let mockTasksQuery: { data?: Record<string, unknown>[], isLoading: boolean } = { data: mockTasks, isLoading: false }
jest.mock('@/api/tasks', () => ({
  useTasks: () => {
    // A render loop would spin forever in jsdom; fail fast instead.
    if (++mockTasksRenders > 500) throw new Error('TasksScreen re-rendered in a loop')
    return mockTasksQuery
  },
  useCreateTask: () => mockMutation,
  useUpdateTask: () => mockMutation,
  useDeleteTask: () => mockMutation,
}))
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: mockWorkspace }) }))
jest.mock('@/api/epics', () => ({ useEpics: () => ({ data: [] }) }))
jest.mock('@/api/taskFields', () => ({ useTaskFields: () => ({ data: [] }) }))
jest.mock('@/components/task-fields/TaskFieldsDialog', () => ({ TaskFieldsDialog: () => null }))
jest.mock('@/components/task-fields/ManageTaskFieldsDialog', () => ({ ManageTaskFieldsDialog: () => null }))
jest.mock('./TaskTimer', () => ({ TaskTimer: () => null }))
jest.mock('@/components/TaskHistoryDialog', () => function HistoryMock() { return null })
jest.mock('@/components/TaskCheckInDialog', () => function CheckInMock({ task }: { task: { title: string } | null }) { return task ? <p>Checking in on {task.title}</p> : null })
jest.mock('@/api/workspaceMembers', () => ({ useWorkspaceMembers: () => ({ data: [] }) }))
jest.mock('@/api/sprints', () => ({ useSprints: () => ({ data: [] }) }))
jest.mock('@/api/milestones', () => ({ useMilestones: () => ({ data: [] }) }))

let mockSettings: TaskStatusSetting[] = []
jest.mock('@/api/taskStatusSettings', () => ({
  useTaskStatusSettings: () => ({ data: mockSettings, isSuccess: true }),
  useSaveTaskStatusSettings: () => mockMutation,
  useResetTaskStatusSettings: () => mockMutation,
}))

function renderScreen(url: string) {
  return render(<MemoryRouter initialEntries={[url]}><TasksScreen /></MemoryRouter>)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRole = 'member'
  mockSettings = []
  mockTasksQuery = { data: mockTasks, isLoading: false }
  mockTasksRenders = 0
})

test('re-rendering while the tasks query is still pending does not loop', () => {
  mockTasksQuery = { data: undefined, isLoading: true }
  const { rerender } = renderScreen('/tasks')
  // A second render (another query settling, say) used to hand the sync effect a new empty array each time.
  expect(() => rerender(<MemoryRouter initialEntries={['/tasks']}><TasksScreen /></MemoryRouter>)).not.toThrow()
})

test('the workboard columns and the move arrow use the Space\'s status names', () => {
  mockSettings = [
    { id: 1, folder_id: null, status: 'todo', label: 'Queued', color: 'red' },
    { id: 2, folder_id: null, status: 'in_progress', label: 'Doing', color: null },
  ]
  renderScreen('/tasks?view=kanban')
  expect(screen.getByText('Queued')).toBeInTheDocument()
  expect(screen.getByText('Doing')).toBeInTheDocument()
  expect(screen.queryByText('To Do')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Move to Doing' })).toBeInTheDocument()
})

test('a folder\'s own names apply when the tasks are filtered to that folder', () => {
  mockSettings = [
    { id: 1, folder_id: null, status: 'todo', label: 'Queued', color: null },
    { id: 2, folder_id: 2, status: 'todo', label: 'Next up', color: null },
  ]
  renderScreen('/tasks?view=kanban&folder_id=2')
  expect(screen.getByText('Next up')).toBeInTheDocument()
  expect(screen.queryByText('Queued')).not.toBeInTheDocument()
})

test('the backlog list and the status filter use the configured names', () => {
  mockSettings = [{ id: 1, folder_id: null, status: 'backlog', label: 'Ideas', color: null }]
  renderScreen('/tasks?view=backlog')
  expect(screen.getByText('Ideas')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Filter' }))
  expect(screen.getByRole('option', { name: 'Ideas' })).toBeInTheDocument()
  expect(screen.getByRole('option', { name: 'To Do' })).toBeInTheDocument()
})

test('members can open the status editor', () => {
  renderScreen('/tasks?view=kanban')
  fireEvent.click(screen.getByRole('button', { name: 'Statuses' }))
  expect(screen.getByRole('dialog', { name: 'Statuses for Personal' })).toBeInTheDocument()
})

test('viewers do not get the status editor', () => {
  mockRole = 'viewer'
  renderScreen('/tasks?view=kanban')
  expect(screen.queryByRole('button', { name: 'Statuses' })).not.toBeInTheDocument()
})

describe('ongoing tasks', () => {
  const watch = { id: 3, title: 'Keep watch', status: 'in_review', epic_id: null, document_id: 1, folder_id: 2, ongoing: true, check_in_recurrence: 'FREQ=WEEKLY', check_in_stale: false }

  test('the card shows the schedule and the latest status, goes red when the check-in is overdue, and opens the check-in box', () => {
    mockTasksQuery = { data: [...mockTasks, { ...watch, check_in_status: 'at_risk' }], isLoading: false }
    const { unmount } = renderScreen('/tasks?view=kanban')
    expect(screen.getByText('Ongoing · weekly')).not.toHaveClass('tasks-meta--stale')
    expect(screen.getByText('At risk')).toBeInTheDocument()
    unmount()

    mockTasksQuery = { data: [...mockTasks, { ...watch, check_in_stale: true }], isLoading: false }
    renderScreen('/tasks?view=kanban')
    expect(screen.getByText('Check-in overdue')).toHaveClass('tasks-meta--stale')
    expect(screen.queryByText('At risk')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Check in on Keep watch' }))
    expect(screen.getByText('Checking in on Keep watch')).toBeInTheDocument()
  })

  test('an ongoing task has no arrow to Done, and other tasks in review do', () => {
    mockTasksQuery = { data: [watch, { ...watch, id: 4, title: 'Plain', ongoing: false }], isLoading: false }
    renderScreen('/tasks?view=kanban')
    expect(screen.getAllByRole('button', { name: /^Move to / })).toHaveLength(1)
  })

  test('the new task row uses the repeat picker\'s schedules to make the task ongoing', () => {
    renderScreen('/tasks?view=backlog')
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
    fireEvent.change(screen.getByLabelText('Ongoing: check in on a schedule'), { target: { value: 'FREQ=WEEKLY;INTERVAL=2' } })
    const title = screen.getByPlaceholderText('Task title…')
    fireEvent.change(title, { target: { value: 'Keep watch' } })
    fireEvent.keyDown(title, { key: 'Enter' })
    expect(mockMutation.mutate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Keep watch', status: 'backlog', ongoing: true, check_in_recurrence: 'FREQ=WEEKLY;INTERVAL=2' }))
  })

  test('a task added without a check-in schedule is not ongoing', () => {
    renderScreen('/tasks?view=backlog')
    fireEvent.click(screen.getByRole('button', { name: 'Add task' }))
    const title = screen.getByPlaceholderText('Task title…')
    fireEvent.change(title, { target: { value: 'Plain' } })
    fireEvent.keyDown(title, { key: 'Enter' })
    expect(mockMutation.mutate).toHaveBeenCalledWith(expect.not.objectContaining({ ongoing: true }))
  })
})
