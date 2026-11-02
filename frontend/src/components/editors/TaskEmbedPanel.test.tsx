import { fireEvent, render, screen } from '@testing-library/react'
import TaskEmbedPanel from './TaskEmbedPanel'
import { TASK_EMBED_DEFAULTS, type TaskEmbedAttrs } from '@/data/taskEmbed'
import type { Task } from '@/types'

const mockUseTasks = jest.fn()
const mockUpdate = jest.fn()
const mockRefetch = jest.fn()
let mockDependencies: unknown[] = []

jest.mock('@/api/tasks', () => ({
  useTasks: (...args: unknown[]) => mockUseTasks(...args),
  useUpdateTask: () => ({ mutate: mockUpdate }),
}))
jest.mock('@/api/taskDependencies', () => ({ useTaskDependencies: () => ({ data: mockDependencies }) }))
jest.mock('@/api/sprints', () => ({ useSprints: () => ({ data: [{ id: 3, title: 'Sprint 3' }, { id: 4, title: 'Sprint 4' }] }) }))
jest.mock('@/api/workspace', () => ({
  useWorkspace: () => ({
    data: {
      folders: [{
        id: 1, name: 'Root', root: true, parent_id: null, position: 0, documents: [{ id: 50, title: 'Launch plan' }],
        children: [{ id: 2, name: 'Messages', root: false, parent_id: 1, position: 0, documents: [], children: [] }],
      }],
    },
  }),
}))
jest.mock('@/hooks/useBoardStatuses', () => ({
  useStatusesForFolder: () => () => jest.requireActual('@/data/task_status').DEFAULT_BOARD_STATUSES,
}))
jest.mock('@/util/errorMessage', () => ({ errorMessage: () => 'Unable to reach the server.' }))

const task = (id: number, title: string, status: Task['status'], start_date: string | null, due_date: string | null) =>
  ({ id, title, status, start_date, due_date, position: id, epic_id: null, folder_id: null }) as unknown as Task

const tasks = [
  task(1, 'Write the brief', 'in_progress', '2026-11-01', '2026-11-12'),
  task(2, 'Design the cover', 'todo', '2026-11-02', '2026-11-05'),
  task(3, 'Ship it', 'done', '2026-11-03', '2026-11-04'),
  task(4, 'Someday', 'backlog', null, null),
]

function loaded(data: Task[] = tasks) {
  mockUseTasks.mockReturnValue({ data, isLoading: false, isError: false, error: null, refetch: mockRefetch })
}

function panel(attrs: Partial<TaskEmbedAttrs> = {}, props: Partial<Parameters<typeof TaskEmbedPanel>[0]> = {}) {
  const onChange = jest.fn()
  const onRemove = jest.fn()
  render(<TaskEmbedPanel attrs={{ ...TASK_EMBED_DEFAULTS, ...attrs }} documentId={50} editable onChange={onChange} onRemove={onRemove} {...props} />)
  return { onChange, onRemove }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockDependencies = []
  loaded()
})

test('lists the open tasks by due date with their status, due date and how much is done', () => {
  panel()
  expect(screen.getByText('Open tasks in this Space')).toBeInTheDocument()
  expect(screen.getByText('1 of 4 done')).toBeInTheDocument()
  const rows = screen.getAllByRole('listitem')
  expect(rows).toHaveLength(3)
  expect(rows[0]).toHaveTextContent('Design the cover')
  expect(rows[0]).toHaveTextContent('To Do')
  expect(rows[0]).toHaveTextContent('Nov 5')
  expect(rows[1]).toHaveTextContent('Write the brief')
  expect(rows[1]).toHaveTextContent('In Progress')
  expect(rows[2]).toHaveTextContent('Someday')
  expect(screen.queryByText('Ship it')).not.toBeInTheDocument()
})

test('asks for the scope\'s tasks and keeps them fresh', () => {
  panel({ scope: 'sprint', scopeId: 3 })
  expect(mockUseTasks).toHaveBeenCalledWith({ sprint_id: 3 }, { enabled: true, refetchInterval: 30_000 })
  expect(screen.getByText('Open tasks in Sprint 3')).toBeInTheDocument()
})

test('names a folder or document by where it is', () => {
  panel({ scope: 'folder', scopeId: 2, status: 'all' })
  expect(mockUseTasks).toHaveBeenCalledWith({ folder_id: 2 }, expect.objectContaining({ enabled: true }))
  expect(screen.getByText('All tasks in Messages')).toBeInTheDocument()
})

test('ticking a task marks it done, unticking puts it back to to do', () => {
  panel({ status: 'all' })
  fireEvent.click(screen.getByRole('checkbox', { name: 'Mark “Design the cover” done' }))
  expect(mockUpdate).toHaveBeenCalledWith({ id: 2, status: 'done' })
  const done = screen.getByRole('checkbox', { name: 'Mark “Ship it” done' })
  expect(done).toBeChecked()
  fireEvent.click(done)
  expect(mockUpdate).toHaveBeenCalledWith({ id: 3, status: 'todo' })
})

test('says so when no task matches the filter', () => {
  loaded([task(3, 'Ship it', 'done', null, null)])
  panel()
  expect(screen.getByText('No tasks match this filter.')).toBeInTheDocument()
  expect(screen.queryByRole('list')).not.toBeInTheDocument()
})

test('shows an error with a way to try again when the tasks cannot be loaded', () => {
  mockUseTasks.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error('x'), refetch: mockRefetch })
  panel()
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to reach the server.')
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(mockRefetch).toHaveBeenCalled()
})

test('shows a loading note until the tasks arrive', () => {
  mockUseTasks.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: mockRefetch })
  panel()
  expect(screen.getByRole('status')).toHaveTextContent('Loading tasks')
})

test('draws the Gantt with the links between the tasks, the driving path and a note on undated ones', () => {
  mockDependencies = [
    { id: 9, predecessor_id: 2, successor_id: 1, kind: 'finish_to_start', created_at: '' },
    { id: 10, predecessor_id: 2, successor_id: 99, kind: 'finish_to_start', created_at: '' },
  ]
  const { container } = render(
    <TaskEmbedPanel attrs={{ ...TASK_EMBED_DEFAULTS, view: 'gantt' }} documentId={50} editable onChange={jest.fn()} />,
  )
  expect(container.querySelectorAll('.timeline-bar')).toHaveLength(2)
  expect(container.querySelectorAll('.timeline-link')).toHaveLength(1)
  expect(container.querySelectorAll('.timeline-bar--critical')).toHaveLength(2)
  expect(screen.getByText('1 task has no due date and is not drawn.')).toBeInTheDocument()
  expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
})

test('while editing, the settings change what is shown', () => {
  const { onChange } = panel()
  expect(screen.queryByLabelText('Tasks from')).not.toBeInTheDocument()
  const toggle = screen.getByRole('button', { name: 'Task list settings' })
  fireEvent.click(toggle)
  expect(toggle).toHaveAttribute('aria-expanded', 'true')

  fireEvent.change(screen.getByLabelText('Show as'), { target: { value: 'gantt' } })
  expect(onChange).toHaveBeenLastCalledWith({ ...TASK_EMBED_DEFAULTS, view: 'gantt' })
  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'done' } })
  expect(onChange).toHaveBeenLastCalledWith({ ...TASK_EMBED_DEFAULTS, status: 'done' })
  fireEvent.change(screen.getByLabelText('Tasks from'), { target: { value: 'document' } })
  expect(onChange).toHaveBeenLastCalledWith({ ...TASK_EMBED_DEFAULTS, scope: 'document', scopeId: 50 })
  fireEvent.change(screen.getByLabelText('Tasks from'), { target: { value: 'folder' } })
  expect(onChange).toHaveBeenLastCalledWith({ ...TASK_EMBED_DEFAULTS, scope: 'folder', scopeId: null })
})

test('a folder or sprint is chosen from a list of the Space\'s own', () => {
  const folder = panel({ scope: 'folder' }, { editable: true })
  expect(screen.getByLabelText('Folder')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Folder'), { target: { value: '2' } })
  expect(folder.onChange).toHaveBeenLastCalledWith({ ...TASK_EMBED_DEFAULTS, scope: 'folder', scopeId: 2 })
})

test('with nothing chosen yet, nothing is fetched and the settings open to ask', () => {
  panel({ scope: 'sprint' })
  expect(mockUseTasks).toHaveBeenCalledWith({}, expect.objectContaining({ enabled: false }))
  expect(screen.getByText('Choose a sprint to list its tasks.')).toBeInTheDocument()
  expect(screen.getByLabelText('Sprint')).toBeInTheDocument()
  expect(screen.queryByText(/of \d+ done/)).not.toBeInTheDocument()
})

test('Remove takes the embed out of the document', () => {
  const { onRemove } = panel()
  fireEvent.click(screen.getByRole('button', { name: 'Remove task list' }))
  expect(onRemove).toHaveBeenCalled()
})

test('a read-only document shows the list without settings, Remove or ticking', () => {
  panel({ status: 'all' }, { editable: false })
  expect(screen.queryByRole('button', { name: 'Task list settings' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Remove task list' })).not.toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Mark “Design the cover” done' })).toBeDisabled()
})
