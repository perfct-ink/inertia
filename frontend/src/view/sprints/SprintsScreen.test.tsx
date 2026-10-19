import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import SprintsScreen from './SprintsScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
const noop = { mutate: jest.fn() }
const mockStart = { mutate: jest.fn() }
const mockClose = { mutate: jest.fn(), isPending: false }
jest.mock('@/api/sprints', () => ({
  useSprints: () => ({
    data: [
      { id: 1, title: 'Sprint 1', goal: null, status: 'planned', start_date: null, end_date: null, tasks_count: 0, done_tasks_count: 0 },
      { id: 2, title: 'Sprint 2', goal: null, status: 'active', start_date: '2026-10-01', end_date: null, tasks_count: 3, done_tasks_count: 1 },
      { id: 3, title: 'Sprint 0', goal: null, status: 'done', start_date: null, end_date: null, tasks_count: 4, done_tasks_count: 4 },
    ],
    isLoading: false,
  }),
  useCreateSprint: () => noop,
  useUpdateSprint: () => noop,
  useDeleteSprint: () => noop,
  useStartSprint: () => mockStart,
  useCloseSprint: () => mockClose,
}))

afterEach(() => jest.clearAllMocks())

test('a planned sprint can be started; only active ones can be closed', () => {
  render(<SprintsScreen />)
  expect(screen.getAllByRole('button', { name: 'Start sprint' })).toHaveLength(1)
  expect(screen.getAllByRole('button', { name: 'Close sprint' })).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Start sprint' }))
  expect(mockStart.mutate).toHaveBeenCalledWith(1)
})

test('closing asks where unfinished tasks go (not the sprint itself or a finished one) and reports the result', () => {
  mockClose.mutate.mockImplementation((_vars, { onSuccess }) => onSuccess({ completed: 1, carried_over: 2 }))
  render(<SprintsScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Close sprint' }))
  const target = screen.getByLabelText('Move unfinished tasks to')
  expect(Array.from((target as HTMLSelectElement).options).map((o) => o.textContent)).toEqual(['No sprint', 'Sprint 1'])
  fireEvent.change(target, { target: { value: '1' } })
  fireEvent.click(screen.getAllByRole('button', { name: 'Close sprint' }).pop() as HTMLElement)
  expect(mockClose.mutate).toHaveBeenCalledWith({ id: 2, carryToSprintId: 1 }, expect.anything())
  expect(screen.getByRole('status')).toHaveTextContent('Sprint 2 closed: 1 task done, 2 moved on.')
})
