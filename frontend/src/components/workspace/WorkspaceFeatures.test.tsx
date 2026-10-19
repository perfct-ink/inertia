import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { NewWorkspaceDialog } from './NewWorkspaceDialog'
import { WorkspaceFeatures } from './WorkspaceFeatures'

const mockUpdate = { mutate: jest.fn(), isPending: false }
jest.mock('@/api/workspaces', () => ({
  canManageWorkspace: (role: string | null) => role === 'admin' || role === 'owner',
  useUpdateWorkspaceFeatures: () => mockUpdate,
}))

afterEach(() => jest.clearAllMocks())

test('an owner turns features off and saves the new list', () => {
  mockUpdate.mutate.mockImplementation((_features, { onSuccess }) => onSuccess())
  const onClose = jest.fn()
  render(<WorkspaceFeatures workspace={{ id: 1, name: 'Band', personal: false, role: 'owner', features: ['events', 'sprints', 'okrs'] }} open onClose={onClose} />)
  expect(screen.getByRole('checkbox', { name: 'Sprints' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Roadmap' })).not.toBeChecked()

  fireEvent.click(screen.getByRole('checkbox', { name: 'Sprints' }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Roadmap' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(mockUpdate.mutate).toHaveBeenCalledWith(['events', 'okrs', 'roadmap'], expect.anything())
  expect(onClose).toHaveBeenCalled()
})

test('a member sees the list read-only, with no Save', () => {
  render(<WorkspaceFeatures workspace={{ id: 1, name: 'Band', personal: false, role: 'member', features: ['events'] }} open onClose={jest.fn()} />)
  expect(screen.getByRole('checkbox', { name: 'Events' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
})

test('a new space starts with every feature on and can drop some', () => {
  const onSubmit = jest.fn()
  render(<NewWorkspaceDialog open onSubmit={onSubmit} onClose={jest.fn()} />)
  expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Space name'), { target: { value: ' Website ' } })
  fireEvent.click(screen.getByRole('checkbox', { name: 'Sprints' }))
  fireEvent.click(screen.getByRole('button', { name: 'Create' }))
  expect(onSubmit).toHaveBeenCalledWith({ name: 'Website', features: ['events', 'epics', 'initiatives', 'milestones', 'okrs', 'roadmap', 'hierarchy'] })
})
