import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { DependencyEditor } from './DependencyEditor'
import type { Folder, Task, TaskDependency } from '@/types'

const mockCreate = { mutate: jest.fn(), isPending: false, isError: false, error: null as Error | null }
const mockDelete = { mutate: jest.fn() }
jest.mock('@/api/taskDependencies', () => ({
  useCreateTaskDependency: () => mockCreate,
  useDeleteTaskDependency: () => mockDelete,
}))
const mockSearch = jest.fn()
jest.mock('@/api/tasks', () => ({ useTaskSearch: (query: string) => mockSearch(query) }))
jest.mock('@/hooks/useDebouncedValue', () => ({ useDebouncedValue: (value: unknown) => value }))

const task = (id: number, title: string, extra: Partial<Task> = {}) =>
  ({ id, title, status: 'todo', start_date: '2026-11-01', due_date: '2026-11-05', folder_id: 1, ...extra }) as unknown as Task
const folder = (id: number, name: string) => ({ id, name, kind: 'project', children: [], documents: [], parent_id: null }) as unknown as Folder
const folders = [folder(1, 'Messages'), folder(3, 'Billing')]
const tasks = [task(1, 'Design'), task(2, 'Build', { start_date: '2026-11-06', due_date: '2026-11-20' })]
const vendor = task(50, 'Vendor contract', { folder_id: 3, start_date: null, due_date: '2026-11-12' })

const link = (id: number, predecessor_id: number, successor_id: number, ends: Partial<TaskDependency> = {}): TaskDependency =>
  ({ id, predecessor_id, successor_id, kind: 'finish_to_start', created_at: '', ...ends })

function renderEditor(external: TaskDependency[] = [], own: TaskDependency[] = []) {
  return render(<DependencyEditor tasks={tasks} dependencies={own} externalDependencies={external} folders={folders} />)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSearch.mockReturnValue({ data: [], isFetching: false })
  mockCreate.isError = false
  mockCreate.error = null
})

test('lists links to other projects apart from the folder\'s own, with the project and a warning when the dates break the link', () => {
  const waitsOnVendor = link(7, 50, 2, {
    predecessor: { id: 50, title: 'Vendor contract', status: 'todo', start_date: null, due_date: '2026-11-12', folder_id: 3 },
    successor: { id: 2, title: 'Build', status: 'todo', start_date: '2026-11-06', due_date: '2026-11-20', folder_id: 1 },
  })
  renderEditor([waitsOnVendor], [link(5, 1, 2)])
  expect(screen.getByRole('heading', { name: 'Other projects' })).toBeInTheDocument()
  const items = screen.getAllByText(/waits on/, { selector: 'span.gantt_pane-item-text' })
  expect(items[0]).toHaveTextContent('Build waits on Design')
  const item = items[1]
  expect(item).toHaveTextContent('Build waits on Vendor contract (Billing)')
  expect(item).toHaveTextContent('Vendor contract due Nov 12')
  expect(item).toHaveTextContent('Dates break this link by 6 days')

  fireEvent.click(screen.getByRole('button', { name: 'Remove dependency of Build on Vendor contract' }))
  expect(mockDelete.mutate).toHaveBeenCalledWith(7)
})

test('a link that holds shows no warning, and a task that waits on this one reads the other way round', () => {
  const vendorWaits = link(8, 1, 50, {
    predecessor: { id: 1, title: 'Design', status: 'todo', start_date: '2026-11-01', due_date: '2026-11-05', folder_id: 1 },
    successor: { id: 50, title: 'Vendor contract', status: 'todo', start_date: '2026-11-10', due_date: '2026-11-12', folder_id: 3 },
  })
  renderEditor([vendorWaits])
  const item = screen.getByText(/waits on/, { selector: 'span.gantt_pane-item-text' })
  expect(item).toHaveTextContent('Vendor contract (Billing) waits on Design')
  expect(item).not.toHaveTextContent('Dates break')
})

test('has no "Other projects" heading when every link is inside the folder', () => {
  renderEditor([], [link(5, 1, 2)])
  expect(screen.queryByRole('heading', { name: 'Other projects' })).not.toBeInTheDocument()
})

test('searches the Space and links a task from another project, named with its project', () => {
  mockSearch.mockImplementation((query: string) => ({ data: query === 'vend' ? [vendor, tasks[0]] : [], isFetching: false }))
  renderEditor()
  fireEvent.change(screen.getByLabelText('Find a task in another project'), { target: { value: 'vend' } })
  expect(mockSearch).toHaveBeenLastCalledWith('vend')
  // The task already on the chart is not offered twice.
  expect(screen.getAllByRole('option', { name: 'Design' })).toHaveLength(2)
  expect(screen.getAllByRole('option', { name: 'Vendor contract (Billing)' })).toHaveLength(2)

  fireEvent.change(screen.getByLabelText('Task that waits'), { target: { value: '2' } })
  fireEvent.change(screen.getByLabelText('Task it waits on'), { target: { value: '50' } })
  // The pick stays chosen when the search is cleared.
  fireEvent.change(screen.getByLabelText('Find a task in another project'), { target: { value: '' } })
  expect(screen.getByLabelText('Task it waits on')).toHaveValue('50')
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(mockCreate.mutate).toHaveBeenCalledWith({ predecessor_id: 50, successor_id: 2, kind: 'finish_to_start' }, expect.anything())
})

test('a link needs one end on this chart', () => {
  const other = task(51, 'Invoice run', { folder_id: 3 })
  mockSearch.mockImplementation((query: string) => ({ data: query ? [vendor, other] : [], isFetching: false }))
  renderEditor()
  fireEvent.change(screen.getByLabelText('Find a task in another project'), { target: { value: 'o' } })
  fireEvent.change(screen.getByLabelText('Task that waits'), { target: { value: '51' } })
  fireEvent.change(screen.getByLabelText('Task it waits on'), { target: { value: '50' } })
  expect(screen.getByText('One of the two tasks has to be on this chart.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
})

test('says when a search finds nothing, and shows the server\'s message when a link is refused', () => {
  mockSearch.mockReturnValue({ data: [], isFetching: false })
  mockCreate.isError = true
  mockCreate.error = new Error('x')
  renderEditor()
  fireEvent.change(screen.getByLabelText('Find a task in another project'), { target: { value: 'zzz' } })
  expect(screen.getByText('No tasks match.')).toBeInTheDocument()
  expect(screen.getByRole('alert')).toBeInTheDocument()
})
