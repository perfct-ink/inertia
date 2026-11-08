import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import NewProjectDialog from './NewProjectDialog'
import { PROJECT_TYPES } from '@/data/projectType'

const mockCreate = { mutate: jest.fn(), isPending: false }
jest.mock('@/api/folders', () => ({ useCreateProject: () => mockCreate }))
const mockDelete = { mutate: jest.fn(), isPending: false }
let mockSaved: unknown[] = []
jest.mock('@/api/projectTypes', () => ({
  useProjectTypes: () => ({ data: mockSaved }),
  useDeleteProjectType: () => mockDelete,
}))
jest.mock('@/util/errorMessage', () => ({ errorMessage: () => 'Name has already been taken' }))

const podcast = { id: 7, key: 'custom_7', name: 'Podcast season', description: 'Weekly episodes', icon: '🎙️', starts_with: { documents: 1, collections: 0, tasks: 3 }, created_at: '2026-11-07T00:00:00Z' }
const onClose = jest.fn()
const onCreated = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  mockSaved = []
  mockCreate.isPending = false
})

function type(name: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'Project name' }), { target: { value: name } })
}

test('offers every built-in type, blank chosen to begin with', () => {
  render(<NewProjectDialog onClose={onClose} />)
  const radios = within(screen.getByRole('radiogroup', { name: 'Project type' })).getAllByRole('radio')
  expect(radios).toHaveLength(PROJECT_TYPES.length)
  expect(screen.getByRole('radio', { name: /Blank/ })).toHaveAttribute('aria-checked', 'true')
  expect(screen.getByRole('radio', { name: /Music release/ })).toHaveAttribute('aria-checked', 'false')
  expect(screen.queryByText('Your types')).not.toBeInTheDocument()
})

test('Create needs a name', () => {
  render(<NewProjectDialog onClose={onClose} />)
  expect(screen.getByRole('button', { name: 'Create project' })).toBeDisabled()
  type('   ')
  expect(screen.getByRole('button', { name: 'Create project' })).toBeDisabled()
  type('Billing')
  expect(screen.getByRole('button', { name: 'Create project' })).toBeEnabled()
})

test('creates a blank project from the name', () => {
  render(<NewProjectDialog onClose={onClose} onCreated={onCreated} />)
  type(' Billing ')
  fireEvent.click(screen.getByRole('button', { name: 'Create project' }))
  expect(mockCreate.mutate).toHaveBeenCalledWith({ name: 'Billing', start: { project_type: 'blank' } }, expect.anything())

  const created = { id: 9, name: 'Billing' }
  act(() => mockCreate.mutate.mock.calls[0][1].onSuccess(created))
  expect(onCreated).toHaveBeenCalledWith(created)
  expect(onClose).toHaveBeenCalled()
})

test('creates a project of the chosen built-in type with its icon and template', () => {
  render(<NewProjectDialog onClose={onClose} />)
  fireEvent.click(screen.getByRole('radio', { name: /Music release/ }))
  expect(screen.getByRole('radio', { name: /Music release/ })).toHaveAttribute('aria-checked', 'true')
  expect(screen.getByRole('radio', { name: /Blank/ })).toHaveAttribute('aria-checked', 'false')
  type('Debut')
  fireEvent.submit(screen.getByRole('textbox', { name: 'Project name' }))

  const music = PROJECT_TYPES.find((t) => t.key === 'music_release')!
  expect(mockCreate.mutate).toHaveBeenCalledWith({ name: 'Debut', start: { project_type: 'music_release', icon: music.icon, template: music.template } }, expect.anything())
})

test('shows why a project could not be made and stays open', () => {
  render(<NewProjectDialog onClose={onClose} />)
  type('Billing')
  fireEvent.click(screen.getByRole('button', { name: 'Create project' }))
  act(() => mockCreate.mutate.mock.calls[0][1].onError(new Error('boom')))
  expect(screen.getByRole('alert')).toHaveTextContent('Name has already been taken')
  expect(onClose).not.toHaveBeenCalled()
})

test('says it is working while the project is being made', () => {
  mockCreate.isPending = true
  render(<NewProjectDialog onClose={onClose} />)
  type('Billing')
  expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled()
})

test("lists the Space's saved types with what they start with, and starts a project from one by its key", () => {
  mockSaved = [podcast]
  render(<NewProjectDialog onClose={onClose} />)
  expect(screen.getByText('Your types')).toBeInTheDocument()
  const option = screen.getByRole('radio', { name: /Podcast season/ })
  expect(option).toHaveTextContent('Weekly episodes')
  expect(option).toHaveTextContent('Starts with 1 document, 3 tasks')
  fireEvent.click(option)
  type('Season 2')
  fireEvent.click(screen.getByRole('button', { name: 'Create project' }))
  expect(mockCreate.mutate).toHaveBeenCalledWith({ name: 'Season 2', start: { project_type: 'custom_7' } }, expect.anything())
})

test('deleting a saved type asks first, then deletes it and drops the choice', () => {
  mockSaved = [podcast]
  render(<NewProjectDialog onClose={onClose} />)
  fireEvent.click(screen.getByRole('radio', { name: /Podcast season/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Delete Podcast season' }))
  expect(mockDelete.mutate).not.toHaveBeenCalled()

  const confirm = screen.getByRole('group', { name: 'Delete Podcast season?' })
  fireEvent.click(within(confirm).getByRole('button', { name: 'Keep' }))
  expect(screen.getByRole('radio', { name: /Podcast season/ })).toHaveAttribute('aria-checked', 'true')

  fireEvent.click(screen.getByRole('button', { name: 'Delete Podcast season' }))
  fireEvent.click(within(screen.getByRole('group', { name: 'Delete Podcast season?' })).getByRole('button', { name: 'Delete' }))
  expect(mockDelete.mutate).toHaveBeenCalledWith(7, expect.anything())

  mockSaved = []
  act(() => mockDelete.mutate.mock.calls[0][1].onSuccess())
  expect(screen.getByRole('radio', { name: /Blank/ })).toHaveAttribute('aria-checked', 'true')
})

test('Cancel closes without creating anything', () => {
  render(<NewProjectDialog onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onClose).toHaveBeenCalled()
  expect(mockCreate.mutate).not.toHaveBeenCalled()
})
