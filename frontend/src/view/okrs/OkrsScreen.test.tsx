import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import OkrsScreen from './OkrsScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })

const mockCreateKr = { mutate: jest.fn(), isPending: false, isError: false, error: null }
const mockUpdateKr = { mutate: jest.fn() }
const mockMutation = { mutate: jest.fn() }
const mockUpdateObjective = { mutate: jest.fn(), isError: false, error: null }
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
  useUpdateObjective: () => mockUpdateObjective,
  useDeleteObjective: () => mockMutation,
  useCreateKeyResult: () => mockCreateKr,
  useUpdateKeyResult: () => mockUpdateKr,
  useDeleteKeyResult: () => mockMutation,
}))
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: { id: 1 } }) }))
jest.mock('@/api/workspaces', () => ({
  useWorkspaceMembers: () => ({ data: [{ user_id: 7, user: { name: 'Ada' } }, { user_id: 8, user: { name: 'Bo' } }] }),
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

test('changes an objective\'s owner and status, and saves an edited title and description', () => {
  render(<OkrsScreen />)
  fireEvent.change(screen.getByLabelText('Owner'), { target: { value: '8' } })
  expect(mockUpdateObjective.mutate).toHaveBeenCalledWith({ id: 1, owner_id: 8 })
  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'done' } })
  expect(mockUpdateObjective.mutate).toHaveBeenCalledWith({ id: 1, status: 'done' })

  const title = screen.getByLabelText('Objective title')
  fireEvent.change(title, { target: { value: 'Delight every user' } })
  fireEvent.blur(title)
  expect(mockUpdateObjective.mutate).toHaveBeenCalledWith({ id: 1, title: 'Delight every user' })

  const description = screen.getByLabelText('Description')
  fireEvent.change(description, { target: { value: 'Make day one great' } })
  fireEvent.blur(description)
  expect(mockUpdateObjective.mutate).toHaveBeenCalledWith({ id: 1, description: 'Make day one great' })
})

test('edits a key result\'s target', () => {
  render(<OkrsScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit key result Activation' }))
  fireEvent.change(screen.getByLabelText('Target value'), { target: { value: '80' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save key result' }))
  expect(mockUpdateKr.mutate).toHaveBeenCalledWith(
    { id: 11, title: 'Activation', initiative_id: null, start_value: 20, target_value: 80, unit: '%' },
    expect.anything(),
  )
})
