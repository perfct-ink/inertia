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

test('nests epics under their initiative and milestone; only epics and tasks can be dragged', () => {
  const epic: Epic = {
    id: 1, title: 'Checkout', folder_id: 1, initiative_id: 5, milestone_id: null, start_date: '2026-11-01', target_date: '2026-11-30',
    tasks_count: 1, done_tasks_count: 0, horizon: null, created_at: '', updated_at: '',
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
