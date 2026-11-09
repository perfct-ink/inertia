import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TasksScreen from './TasksScreen'
import type { TaskStatusSetting } from '@/types'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
// Dragging itself is not under test; these stand in for dnd-kit so the board renders in jsdom.
// The context keeps its handlers so a test can play a drop.
const mockDnd: { handlers: { onDragStart: (e: unknown) => void; onDragOver: (e: unknown) => void; onDragEnd: (e: unknown) => void } | null } = { handlers: null }
jest.mock('@dnd-kit/core', () => ({
  DndContext: (props: { children: React.ReactNode; onDragStart: (e: unknown) => void; onDragOver: (e: unknown) => void; onDragEnd: (e: unknown) => void }) => {
    mockDnd.handlers = props
    return <div>{props.children}</div>
  },
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
interface MockTask { id: number; title: string; status: string; epic_id: number | null; document_id: number; folder_id: number }
const mockTasks: MockTask[] = [
  { id: 1, title: 'Write copy', status: 'todo', epic_id: null, document_id: 1, folder_id: 2 },
  { id: 2, title: 'Old idea', status: 'backlog', epic_id: null, document_id: 1, folder_id: 2 },
]
let mockTasksRenders = 0
let mockTasksQuery: { data?: MockTask[], isLoading: boolean } = { data: mockTasks, isLoading: false }
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
let mockEpics: { id: number; title: string }[] = []
jest.mock('@/api/epics', () => ({ useEpics: () => ({ data: mockEpics }) }))
jest.mock('@/api/taskFields', () => ({ useTaskFields: () => ({ data: [] }) }))
jest.mock('@/components/task-fields/TaskFieldsDialog', () => ({ TaskFieldsDialog: () => null }))
jest.mock('@/components/task-fields/ManageTaskFieldsDialog', () => ({ ManageTaskFieldsDialog: () => null }))
jest.mock('./TaskTimer', () => ({ TaskTimer: () => null }))
jest.mock('@/components/TaskHistoryDialog', () => function HistoryMock() { return null })
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
  mockEpics = []
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

describe('organize by epic', () => {
  const epicTasks: MockTask[] = [
    { id: 1, title: 'Write copy', status: 'todo', epic_id: 1, document_id: 1, folder_id: 2 },
    { id: 2, title: 'Ship it', status: 'done', epic_id: 2, document_id: 1, folder_id: 2 },
    { id: 3, title: 'Loose end', status: 'in_progress', epic_id: null, document_id: 1, folder_id: 2 },
  ]

  beforeEach(() => {
    mockEpics = [{ id: 1, title: 'Onboarding' }, { id: 2, title: 'Billing' }, { id: 3, title: 'Empty epic' }]
    mockTasksQuery = { data: epicTasks, isLoading: false }
  })

  test('is off by default: one board, with the toggle on the workboard only', () => {
    renderScreen('/tasks?view=kanban')
    expect(screen.getByRole('checkbox', { name: 'Organize by epic' })).not.toBeChecked()
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    expect(screen.getAllByText('To Do')).toHaveLength(1)
  })

  test('the backlog tab has no toggle', () => {
    renderScreen('/tasks?view=backlog')
    expect(screen.queryByRole('checkbox', { name: 'Organize by epic' })).not.toBeInTheDocument()
  })

  test('turning it on makes a lane per epic with tasks plus No epic, each with every column', () => {
    renderScreen('/tasks?view=kanban')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Organize by epic' }))
    const lanes = screen.getAllByRole('region')
    expect(lanes.map((l) => l.getAttribute('aria-label'))).toEqual(['Onboarding', 'Billing', 'No epic'])
    expect(within(lanes[0]).getByText('Write copy')).toBeInTheDocument()
    expect(within(lanes[0]).queryByText('Ship it')).not.toBeInTheDocument()
    expect(within(lanes[1]).getByText('Ship it')).toBeInTheDocument()
    expect(within(lanes[2]).getByText('Loose end')).toBeInTheDocument()
    expect(within(lanes[0]).getByText('To Do')).toBeInTheDocument()
    expect(within(lanes[0]).getByText('Done')).toBeInTheDocument()
    // The epic is the lane, so cards don't repeat it.
    expect(within(lanes[0]).getAllByText('Onboarding')).toHaveLength(1)
  })

  test('turning it off returns to the single board', () => {
    renderScreen('/tasks?view=kanban&lanes=epic')
    expect(screen.getByRole('checkbox', { name: 'Organize by epic' })).toBeChecked()
    expect(screen.getAllByRole('region')).toHaveLength(3)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Organize by epic' }))
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    expect(screen.getByText('Billing')).toBeInTheDocument()
  })

  test('a task added in a lane starts under that lane\'s epic', () => {
    renderScreen('/tasks?view=kanban&lanes=epic')
    const billing = screen.getByRole('region', { name: 'Billing' })
    fireEvent.click(within(billing).getAllByRole('button', { name: 'Add task' })[0])
    const title = screen.getByPlaceholderText('Task title…')
    fireEvent.change(title, { target: { value: 'Invoices' } })
    fireEvent.keyDown(title, { key: 'Enter' })
    expect(mockMutation.mutate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Invoices', epicId: 2, status: 'todo' }))
  })

  test('the move arrow still advances a card inside a lane', () => {
    renderScreen('/tasks?view=kanban&lanes=epic')
    const onboarding = screen.getByRole('region', { name: 'Onboarding' })
    fireEvent.click(within(onboarding).getByRole('button', { name: 'Move to In Progress' }))
    expect(mockMutation.mutate).toHaveBeenCalledWith({ id: 1, status: 'in_progress' })
  })

  test('with no tasks the No epic lane is still there to add one', () => {
    mockTasksQuery = { data: [], isLoading: false }
    renderScreen('/tasks?view=kanban&lanes=epic')
    expect(screen.getAllByRole('region').map((l) => l.getAttribute('aria-label'))).toEqual(['No epic'])
  })

  // Plays a drag of card 1 (Onboarding, To Do) over a column and drops it there.
  function dropCardOn(columnId: string) {
    const drag = { active: { id: 1 }, over: { id: columnId } }
    act(() => { mockDnd.handlers!.onDragStart(drag) })
    act(() => { mockDnd.handlers!.onDragOver(drag) })
    act(() => { mockDnd.handlers!.onDragEnd(drag) })
  }

  test('dropping a card in another lane saves the lane\'s epic with the status', () => {
    renderScreen('/tasks?view=kanban&lanes=epic')
    dropCardOn('epic-2|in_review')
    expect(mockMutation.mutate).toHaveBeenCalledWith({ id: 1, status: 'in_review', epic_id: 2 })
  })

  test('dropping a card in the No epic lane clears its epic, and in its own lane saves only the status', () => {
    renderScreen('/tasks?view=kanban&lanes=epic')
    dropCardOn('no-epic|todo')
    expect(mockMutation.mutate).toHaveBeenCalledWith({ id: 1, epic_id: null })
    mockMutation.mutate.mockClear()
    dropCardOn('epic-1|done')
    expect(mockMutation.mutate).toHaveBeenCalledWith({ id: 1, status: 'done' })
  })

  test('on the plain board a drop saves only the status', () => {
    renderScreen('/tasks?view=kanban')
    dropCardOn('done')
    expect(mockMutation.mutate).toHaveBeenCalledWith({ id: 1, status: 'done' })
  })
})
