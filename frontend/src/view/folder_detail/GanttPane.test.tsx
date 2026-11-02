import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import GanttPane from './GanttPane'
import type { GanttGroups } from '@/data/schedule'
import type { Epic, Task } from '@/types'

const mockCreate = { mutate: jest.fn(), isPending: false, isError: false, error: null }
const mockDelete = { mutate: jest.fn() }
jest.mock('@/api/taskDependencies', () => ({
  useTaskDependencies: () => ({
    data: [
      { id: 9, predecessor_id: 1, successor_id: 2, kind: 'finish_to_start', created_at: '' },
      { id: 10, predecessor_id: 1, successor_id: 99, kind: 'finish_to_start', created_at: '' },
    ],
  }),
  useCreateTaskDependency: () => mockCreate,
  useDeleteTaskDependency: () => mockDelete,
}))

const task = (id: number, title: string, start_date: string, due_date: string) =>
  ({ id, title, status: 'todo', start_date, due_date, epic_id: null }) as unknown as Task

const tasks = [task(1, 'Design', '2026-11-01', '2026-11-05'), task(2, 'Build', '2026-11-06', '2026-11-20')]

test('draws links between this folder\'s tasks, flags the driving path, and edits links', () => {
  const { container } = render(
    <QueryClientProvider client={new QueryClient()}>
      <GanttPane folderId={1} dependencyMode="strict" epics={[]} tasks={tasks} milestones={[]} />
    </QueryClientProvider>,
  )
  expect(container.querySelectorAll('.timeline-link')).toHaveLength(1)
  expect(container.querySelectorAll('.timeline-bar--critical')).toHaveLength(2)
  expect(screen.getByText(/waits on/, { selector: 'span.gantt_pane-item-text' })).toHaveTextContent('Build waits on Design')

  fireEvent.click(screen.getByLabelText('Highlight critical path'))
  expect(container.querySelectorAll('.timeline-bar--critical')).toHaveLength(0)

  fireEvent.click(screen.getByRole('button', { name: 'Remove dependency of Build on Design' }))
  expect(mockDelete.mutate).toHaveBeenCalledWith(9)

  fireEvent.change(screen.getByLabelText('Task that waits'), { target: { value: '1' } })
  fireEvent.change(screen.getByLabelText('Task it waits on'), { target: { value: '2' } })
  fireEvent.change(screen.getByLabelText('Link type'), { target: { value: 'start_to_start' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add' }))
  expect(mockCreate.mutate).toHaveBeenCalledWith({ predecessor_id: 2, successor_id: 1, kind: 'start_to_start' }, expect.anything())
})

describe('drawing a link by dragging between bar sides', () => {
  const three = [...tasks, task(3, 'Launch', '2026-11-25', '2026-11-30')]

  function renderPane() {
    return render(
      <QueryClientProvider client={new QueryClient()}>
        <GanttPane folderId={1} dependencyMode="strict" epics={[]} tasks={three} milestones={[]} />
      </QueryClientProvider>,
    )
  }
  const handle = (container: HTMLElement, key: string, side: string) =>
    container.querySelector(`[data-link-key="${key}"][data-link-side="${side}"]`) as HTMLElement

  function drag(container: HTMLElement, from: HTMLElement, to: HTMLElement | null) {
    const original = document.elementFromPoint
    document.elementFromPoint = () => to
    fireEvent.pointerDown(from)
    expect(container.querySelector('.timeline-linking')).toBeInTheDocument()
    fireEvent.pointerMove(window, { clientX: 50, clientY: 20 })
    fireEvent.pointerUp(window, { clientX: 50, clientY: 20 })
    document.elementFromPoint = original
  }

  beforeEach(() => mockCreate.mutate.mockClear())

  test('end of A onto start of C creates a finish-to-start link', () => {
    const { container } = renderPane()
    drag(container, handle(container, 'task-1', 'end'), handle(container, 'task-3', 'start'))
    expect(mockCreate.mutate).toHaveBeenCalledWith({ predecessor_id: 1, successor_id: 3, kind: 'finish_to_start' })
    expect(container.querySelector('.timeline-linking')).not.toBeInTheDocument()
  })

  test('start of A onto end of C creates a start-to-finish link', () => {
    const { container } = renderPane()
    drag(container, handle(container, 'task-1', 'start'), handle(container, 'task-3', 'end'))
    expect(mockCreate.mutate).toHaveBeenCalledWith({ predecessor_id: 1, successor_id: 3, kind: 'start_to_finish' })
  })

  test('dropping on empty space, the same task, or an existing pair creates nothing', () => {
    const { container } = renderPane()
    drag(container, handle(container, 'task-1', 'end'), null)
    drag(container, handle(container, 'task-1', 'end'), handle(container, 'task-1', 'start'))
    drag(container, handle(container, 'task-1', 'end'), handle(container, 'task-2', 'start'))
    expect(mockCreate.mutate).not.toHaveBeenCalled()
  })
})

test('zoom redraws the axis and weekends are shaded only when they are wide enough to see', () => {
  const { container } = render(
    <QueryClientProvider client={new QueryClient()}>
      <GanttPane folderId={1} dependencyMode="strict" epics={[]} tasks={tasks} milestones={[]} />
    </QueryClientProvider>,
  )
  expect(container.querySelectorAll('.timeline-month')).toHaveLength(1)
  expect(container.querySelectorAll('.timeline-weekend')).toHaveLength(0)

  fireEvent.change(screen.getByLabelText('Zoom'), { target: { value: 'day' } })
  expect(container.querySelectorAll('.timeline-month')).toHaveLength(30)
  expect(container.querySelectorAll('.timeline-weekend')).toHaveLength(5)
  expect(container.querySelector('.timeline-chart--zoomed')).not.toBeNull()
  expect(container.querySelectorAll('.timeline-bar')).toHaveLength(2)

  fireEvent.click(screen.getByLabelText('Shade weekends'))
  expect(container.querySelectorAll('.timeline-weekend')).toHaveLength(0)
})

test('nests epics under their initiative and milestone; only epics and tasks can be dragged', () => {
  const epic: Epic = {
    id: 1, title: 'Checkout', folder_id: 1, initiative_id: 5, milestone_id: null, start_date: '2026-11-01', target_date: '2026-11-30',
    tasks_count: 1, done_tasks_count: 0, horizon: null, position: 0, created_at: '', updated_at: '',
  }
  const groups: GanttGroups = {
    initiatives: [{ id: 5, title: 'Payments', start_date: null, target_date: null, milestone_id: 7, tasks_count: 1, done_tasks_count: 0, health: 'on_track' }],
    milestones: [
      { id: 7, title: 'Beta', target_date: '2026-12-15', tasks_count: 1, done_tasks_count: 0, health: 'on_track' },
      { id: 8, title: 'Elsewhere', target_date: '2026-12-31', tasks_count: 3, done_tasks_count: 0, health: 'on_track' },
    ],
  }
  const { container } = render(
    <QueryClientProvider client={new QueryClient()}>
      <GanttPane folderId={1} dependencyMode="none" epics={[epic]} tasks={[{ ...tasks[0], epic_id: 1 }]} milestones={[]} groups={groups} />
    </QueryClientProvider>,
  )
  const titles = Array.from(container.querySelectorAll('.timeline-title')).map((el) => el.textContent)
  expect(titles).toEqual(['Beta', 'Payments', 'Checkout', 'Design'])
  expect(container.querySelectorAll('.timeline-bar--group')).toHaveLength(2)
  expect(container.querySelectorAll('.timeline-bar--editable')).toHaveLength(2)
})
