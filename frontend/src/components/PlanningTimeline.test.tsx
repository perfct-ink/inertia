import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import PlanningTimeline from './PlanningTimeline'
import type { Epic } from '@/types'

const mockEpic = (id: number, title: string, initiative_id: number | null): Epic => ({
  id, title, folder_id: null, initiative_id, milestone_id: null, start_date: '2026-03-01', target_date: '2026-03-31',
  tasks_count: 1, done_tasks_count: 0, horizon: null, position: 0, created_at: '', updated_at: '',
})
const mockEpics = [mockEpic(1, 'Build', 5), mockEpic(2, 'Lone', null)]
const mockUpdateEpic = { mutate: jest.fn() }
const mockUpdateInitiative = { mutate: jest.fn() }
jest.mock('@/api/epics', () => ({ useEpics: () => ({ data: mockEpics }), useUpdateEpic: () => mockUpdateEpic }))
jest.mock('@/api/initiatives', () => ({
  useInitiatives: () => ({
    data: [
      { id: 5, title: 'Launch', start_date: '2026-03-01', target_date: '2026-03-31', milestone_id: 7, tasks_count: 1, done_tasks_count: 0, health: 'on_track' },
      { id: 6, title: 'Later', start_date: null, target_date: null, milestone_id: null, tasks_count: 0, done_tasks_count: 0, health: 'on_track' },
    ],
  }),
  useUpdateInitiative: () => mockUpdateInitiative,
}))
jest.mock('@/api/milestones', () => ({
  useMilestones: () => ({ data: [{ id: 7, title: 'Beta', target_date: '2026-04-30', tasks_count: 1, done_tasks_count: 0, health: 'on_track' }] }),
}))
jest.mock('@/api/tasks', () => ({
  useTasks: () => ({
    data: [
      { id: 10, title: 'Ship it', status: 'todo', epic_id: 1, start_date: '2026-03-02', due_date: '2026-03-05' },
      { id: 11, title: 'Loose task', status: 'todo', epic_id: null, start_date: '2026-03-02', due_date: '2026-03-05' },
    ],
  }),
}))

const titles = (container: HTMLElement) => Array.from(container.querySelectorAll('.timeline-title')).map((el) => el.textContent)

test('draws milestone, initiative, epic and task rows with a diamond per milestone', () => {
  const { container } = render(<PlanningTimeline />)
  expect(titles(container)).toEqual(['Milestones', 'Beta', 'Launch', 'Build', 'Ship it', 'Lone'])
  expect(screen.getByRole('img', { name: 'Milestone Beta, 2026-04-30' })).toBeInTheDocument()
})

test('epics and initiatives with their own dates can be moved; milestone and task rows cannot', () => {
  const { container } = render(<PlanningTimeline />)
  // Launch (initiative), Build and Lone (epics); not Beta (milestone) or Ship it (task).
  expect(screen.getAllByRole('group').map((el) => el.getAttribute('aria-label')?.split(',')[0])).toEqual(['Launch', 'Build', 'Lone'])
  expect(container.querySelectorAll('.timeline-bar--editable')).toHaveLength(3)

  fireEvent.keyDown(screen.getByRole('group', { name: /^Build,/ }), { key: 'ArrowRight' })
  fireEvent.keyDown(screen.getByRole('group', { name: /^Build,/ }), { key: 'Enter' })
  expect(mockUpdateEpic.mutate).toHaveBeenCalledWith({ id: 1, start_date: '2026-03-02', target_date: '2026-04-01' })

  fireEvent.keyDown(screen.getByRole('group', { name: /^Launch,/ }), { key: 'ArrowLeft', shiftKey: true })
  fireEvent.keyDown(screen.getByRole('group', { name: /^Launch,/ }), { key: 'Enter' })
  expect(mockUpdateInitiative.mutate).toHaveBeenCalledWith({ id: 5, start_date: '2026-03-01', target_date: '2026-03-30' })
})

test('an epic subset narrows the rows, and the Initiatives page also lists empty initiatives', () => {
  const { container, rerender } = render(<PlanningTimeline epics={[mockEpics[1]]} />)
  expect(titles(container)).toEqual(['Lone'])
  expect(screen.queryByText(/Later/)).not.toBeInTheDocument()

  // An initiative with no dates can't be drawn, so it is named under the chart.
  rerender(<PlanningTimeline keepEmptyInitiatives />)
  expect(screen.getByText(/Not shown.*Later/)).toBeInTheDocument()
})
