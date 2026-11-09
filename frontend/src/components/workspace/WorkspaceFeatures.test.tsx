import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { NewWorkspaceDialog } from './NewWorkspaceDialog'
import { WorkspaceFeatures } from './WorkspaceFeatures'
import { ALL_WORKSPACE_FEATURES } from '@/data/workspaceFeature'
import type { WorkspaceSummary } from '@/types'

const mockUpdate = { mutate: jest.fn(), isPending: false }
jest.mock('@/api/workspace', () => ({ useUpdateWorkspaceFeatures: () => mockUpdate }))
jest.mock('@/api/workspaces', () => ({
  canManageWorkspace: (role: string | null | undefined) => role === 'admin' || role === 'owner',
}))

const space = (role: WorkspaceSummary['role'], features?: string[]): WorkspaceSummary => ({ id: 1, name: 'Band', personal: false, role, features })

afterEach(() => jest.clearAllMocks())

test('shows every page checked for a Space that never chose, grouped by heading', () => {
  render(<WorkspaceFeatures workspace={space('owner')} open onClose={jest.fn()} />)
  expect(screen.getByRole('dialog', { name: 'Features in Band' })).toBeInTheDocument()
  expect(screen.getAllByRole('checkbox')).toHaveLength(ALL_WORKSPACE_FEATURES.length)
  for (const box of screen.getAllByRole('checkbox')) expect(box).toBeChecked()
  expect(screen.getByText('Planning')).toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: 'Sprints' })).toBeInTheDocument()
})

test('an owner turns pages off and saves the new list in rail order', () => {
  mockUpdate.mutate.mockImplementation((_features, { onSuccess }) => onSuccess())
  const onClose = jest.fn()
  render(<WorkspaceFeatures workspace={space('owner', ['events', 'sprints', 'okrs'])} open onClose={onClose} />)
  expect(screen.getByRole('checkbox', { name: 'Sprints' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Roadmap' })).not.toBeChecked()
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()

  fireEvent.click(screen.getByRole('checkbox', { name: 'Sprints' }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Roadmap' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(mockUpdate.mutate).toHaveBeenCalledWith(['events', 'roadmap', 'okrs'], expect.anything())
  expect(onClose).toHaveBeenCalled()
})

test('an admin can save too', () => {
  render(<WorkspaceFeatures workspace={space('admin')} open onClose={jest.fn()} />)
  fireEvent.click(screen.getByRole('checkbox', { name: 'Ideas' }))
  expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
})

test('a failed save keeps the dialog open and says why', () => {
  mockUpdate.mutate.mockImplementation((_features, { onError }) => onError(new Error('nope')))
  const onClose = jest.fn()
  render(<WorkspaceFeatures workspace={space('owner')} open onClose={onClose} />)
  fireEvent.click(screen.getByRole('checkbox', { name: 'Sprints' }))
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to save. Please try again.')
  expect(onClose).not.toHaveBeenCalled()
})

test('a member sees the list read-only, with no Save', () => {
  render(<WorkspaceFeatures workspace={space('member', ['events'])} open onClose={jest.fn()} />)
  expect(screen.getByRole('checkbox', { name: 'Events' })).toBeDisabled()
  expect(screen.getByRole('checkbox', { name: 'Events' })).toBeChecked()
  expect(screen.getByRole('checkbox', { name: 'Sprints' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
})

test('a new Space starts with every page on, needs a name, and can drop some', () => {
  const onSubmit = jest.fn()
  const onClose = jest.fn()
  render(<NewWorkspaceDialog open onSubmit={onSubmit} onClose={onClose} />)
  expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled()
  for (const box of screen.getAllByRole('checkbox')) expect(box).toBeChecked()

  fireEvent.change(screen.getByRole('textbox', { name: 'Space name' }), { target: { value: ' Website ' } })
  fireEvent.click(screen.getByRole('checkbox', { name: 'Sprints' }))
  fireEvent.click(screen.getByRole('button', { name: 'Create' }))
  expect(onSubmit).toHaveBeenCalledWith({ name: 'Website', features: ALL_WORKSPACE_FEATURES.filter((f) => f !== 'sprints') })
  expect(onClose).toHaveBeenCalled()
})
