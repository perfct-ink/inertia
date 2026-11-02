import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import MilestonesScreen from './MilestonesScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })

jest.mock('@/components/comments/CommentsButton', () => ({
  CommentsButton: ({ type, id, title }: { type: string; id: number; title: string }) =>
    <button aria-label={`Comments on ${title}`} data-type={type} data-id={id} />,
}))

const mockMutation = { mutate: jest.fn() }
const mockMilestones = [{
  id: 1, title: 'Beta', description: null, target_date: '2026-12-01', status: 'active', owner_id: null, folder_id: null,
  tasks_count: 4, done_tasks_count: 1, epics_count: 2, initiatives_count: 1, percent: 25, health: 'at_risk',
  created_at: '', updated_at: '',
}]
jest.mock('@/api/milestones', () => ({
  useMilestones: () => ({ data: mockMilestones, isLoading: false }),
  useCreateMilestone: () => mockMutation,
  useUpdateMilestone: () => mockMutation,
  useDeleteMilestone: () => mockMutation,
}))

test('shows each milestone with its health and rollup counts', () => {
  render(<MilestonesScreen />)
  expect(screen.getByRole('heading', { name: 'Beta' })).toBeInTheDocument()
  expect(screen.getByText('At risk')).toBeInTheDocument()
  expect(screen.getByText(/1\/4 tasks done · 2 epics · 1 initiatives/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Delete Beta' })).toBeInTheDocument()
})

test('each milestone opens its own comments', () => {
  render(<MilestonesScreen />)
  const button = screen.getByRole('button', { name: 'Comments on Beta' })
  expect(button).toHaveAttribute('data-type', 'Milestone')
  expect(button).toHaveAttribute('data-id', '1')
})
