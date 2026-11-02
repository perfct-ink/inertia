import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import TimelineScreen from './TimelineScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
jest.mock('@/components/Timeline', () => ({
  Timeline: ({ items }: { items: { title: string }[] }) => <ul data-testid="timeline">{items.map((i) => <li key={i.title}>{i.title}</li>)}</ul>,
}))
let mockTasks: unknown[]
jest.mock('@/api/tasks', () => ({ useTasks: () => ({ data: mockTasks, isLoading: false }) }))
jest.mock('@/api/epics', () => ({
  useEpics: () => ({ data: [{ id: 1, title: 'Onboarding', start_date: '2026-11-01', target_date: '2026-11-30', tasks_count: 1, done_tasks_count: 0 }] }),
}))

const task = (id: number, title: string, due_date: string | null, epic_id: number | null = null) =>
  ({ id, title, status: 'todo', epic_id, start_date: null, due_date })

test('plots dated tasks and says how many have no date', () => {
  mockTasks = [task(1, 'Ship', '2026-11-10'), task(2, 'Someday', null)]
  render(<TimelineScreen />)
  expect(screen.getByTestId('timeline')).toHaveTextContent('Ship')
  expect(screen.getByTestId('timeline')).not.toHaveTextContent('Someday')
  expect(screen.getByText(/1 task has no due date/)).toBeInTheDocument()
})

test('grouping by epic adds the epic rows', () => {
  mockTasks = [task(1, 'Ship', '2026-11-10', 1)]
  render(<TimelineScreen />)
  fireEvent.change(screen.getByLabelText('Group by'), { target: { value: 'epic' } })
  expect(screen.getByTestId('timeline')).toHaveTextContent('Onboarding')
  expect(screen.getByTestId('timeline')).toHaveTextContent('Ship')
})

test('with no dated tasks it explains how to get something on the timeline', () => {
  mockTasks = [task(1, 'Someday', null)]
  render(<TimelineScreen />)
  expect(screen.getByText(/No tasks with dates yet/)).toBeInTheDocument()
})
