import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import OkrsScreen from './OkrsScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })

const mockCreateKr = { mutate: jest.fn(), isPending: false, isError: false, error: null }
const mockUpdateKr = { mutate: jest.fn() }
const mockMutation = { mutate: jest.fn() }
const mockCheckIn = { mutate: jest.fn(), isPending: false }
jest.mock('@/api/objectives', () => ({
  useObjectives: () => ({
    data: [{
      id: 1, title: 'Delight new users', status: 'active', start_date: '2026-10-01', target_date: '2026-12-31',
      percent: 38, score: 0.38, health: 'at_risk',
      key_results: [
        { id: 11, objective_id: 1, title: 'Activation', initiative_id: null, start_value: 20, target_value: 60, current_value: 30, unit: '%', percent: 25 },
        { id: 12, objective_id: 1, title: 'Ship onboarding', initiative_id: 5, start_value: 0, target_value: null, current_value: 0, unit: null, percent: 50 },
      ],
    }],
    isLoading: false,
  }),
  useCreateObjective: () => mockMutation,
  useUpdateObjective: () => mockMutation,
  useDeleteObjective: () => mockMutation,
  useCreateKeyResult: () => mockCreateKr,
  useUpdateKeyResult: () => mockUpdateKr,
  useCreateCheckIn: () => mockCheckIn,
  useKeyResultCheckIns: () => ({ data: [{ id: 1, key_result_id: 11, value: 30, note: 'Launch week', author_name: 'Sam', created_at: '2026-10-05T00:00:00Z' }] }),
  useDeleteKeyResult: () => mockMutation,
}))
jest.mock('@/api/initiatives', () => ({
  useInitiatives: () => ({ data: [{ id: 5, title: 'Onboarding', tasks_count: 4, done_tasks_count: 2 }] }),
}))

test('shows objectives with score, health and both kinds of key result', () => {
  render(<OkrsScreen />)
  expect(screen.getByRole('heading', { name: 'Delight new users' })).toBeInTheDocument()
  expect(screen.getByText('0.38')).toBeInTheDocument()
  expect(screen.getByText('At risk')).toBeInTheDocument()
  expect(screen.getByText('30 / 60 %')).toBeInTheDocument()
  expect(screen.getByText(/From initiative Onboarding: 2\/4 tasks done/)).toBeInTheDocument()
})

test('updates a number key result and adds one linked to an initiative', () => {
  render(<OkrsScreen />)
  const current = screen.getByLabelText('Current value for Activation')
  fireEvent.change(current, { target: { value: '45' } })
  fireEvent.blur(current)
  expect(mockUpdateKr.mutate).toHaveBeenCalledWith({ id: 11, current_value: 45 })

  fireEvent.change(screen.getByLabelText('New key result'), { target: { value: 'Launch tour' } })
  fireEvent.change(screen.getByLabelText('Measured by'), { target: { value: '5' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add key result' }))
  expect(mockCreateKr.mutate).toHaveBeenCalledWith({ objective_id: 1, title: 'Launch tour', initiative_id: 5 }, expect.anything())
})

test('shows check-in history and adds a check-in with a note', () => {
  render(<OkrsScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Check-ins' }))
  expect(screen.getByText(/Launch week/)).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Check-in value for Activation'), { target: { value: '45' } })
  fireEvent.change(screen.getByLabelText('Check-in note for Activation'), { target: { value: 'Mid-month' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add check-in' }))
  expect(mockCheckIn.mutate).toHaveBeenCalledWith({ value: 45, note: 'Mid-month' }, expect.anything())
})
