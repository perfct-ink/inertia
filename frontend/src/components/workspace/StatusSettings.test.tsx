import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { StatusSettings } from './StatusSettings'
import type { TaskStatusSetting } from '@/types'

const mockSave = { mutate: jest.fn(), isPending: false }
const mockReset = { mutate: jest.fn(), isPending: false }
let mockSettings: TaskStatusSetting[] = []
let mockLoaded = true

jest.mock('@/api/taskStatusSettings', () => ({
  useTaskStatusSettings: () => ({ data: mockSettings, isSuccess: mockLoaded }),
  useSaveTaskStatusSettings: () => mockSave,
  useResetTaskStatusSettings: () => mockReset,
}))
// Root(1) > Project(2)
const mockWorkspace = {
  folders: [{ id: 1, name: 'Root', root: true, parent_id: null, documents: [], children: [{ id: 2, name: 'Project', root: false, parent_id: 1, documents: [], children: [] }] }],
}
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: mockWorkspace }) }))

const row = (id: number, folder_id: number | null, status: TaskStatusSetting['status'], label: string | null, color: TaskStatusSetting['color'] = null) =>
  ({ id, folder_id, status, label, color }) as TaskStatusSetting

const nameField = (status: string) => screen.getByRole('textbox', { name: `Name for ${status}` })
const colorButton = (status: string, color: string) =>
  within(screen.getByRole('group', { name: `Color for ${status}` })).getByRole('button', { name: color })

beforeEach(() => {
  jest.clearAllMocks()
  mockSettings = []
  mockLoaded = true
})

test('the Space default starts from the built-in names and colors', () => {
  render(<StatusSettings open folderId={null} boardName="Personal" onClose={jest.fn()} />)
  expect(screen.getByText('Statuses for Personal')).toBeInTheDocument()
  expect(nameField('To Do')).toHaveValue('To Do')
  expect(nameField('Backlog')).toHaveValue('Backlog')
  expect(colorButton('In Progress', 'Blue')).toHaveAttribute('aria-pressed', 'true')
  expect(colorButton('In Progress', 'Red')).toHaveAttribute('aria-pressed', 'false')
  expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
})

test('saves only the statuses that were renamed or recolored', () => {
  render(<StatusSettings open folderId={null} boardName="Personal" onClose={jest.fn()} />)
  fireEvent.change(nameField('In Progress'), { target: { value: ' Doing ' } })
  fireEvent.click(colorButton('In Progress', 'Orange'))
  fireEvent.click(colorButton('Done', 'Purple'))
  expect(colorButton('In Progress', 'Orange')).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(mockSave.mutate).toHaveBeenCalledWith({
    folderId: null,
    statuses: [
      { status: 'in_progress', label: 'Doing', color: 'orange' },
      { status: 'done', color: 'purple' },
    ],
  }, expect.anything())
})

test('a folder starts from what it inherits and saves only its own differences', () => {
  mockSettings = [row(1, null, 'todo', 'Queued'), row(2, 2, 'done', 'Shipped')]
  render(<StatusSettings open folderId={2} boardName="Project" onClose={jest.fn()} />)
  expect(nameField('To Do')).toHaveValue('Queued')
  expect(nameField('Done')).toHaveValue('Shipped')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(mockSave.mutate).toHaveBeenCalledWith({ folderId: 2, statuses: [{ status: 'done', label: 'Shipped' }] }, expect.anything())
})

test('Reset clears the board\'s own settings only when it has some', () => {
  mockSettings = [row(1, null, 'todo', 'Queued')]
  const { unmount } = render(<StatusSettings open folderId={2} boardName="Project" onClose={jest.fn()} />)
  expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
  unmount()

  mockSettings = [row(2, 2, 'done', 'Shipped')]
  render(<StatusSettings open folderId={2} boardName="Project" onClose={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
  expect(mockReset.mutate).toHaveBeenCalledWith(2, expect.anything())
})

test('Cancel closes without saving', () => {
  const onClose = jest.fn()
  render(<StatusSettings open folderId={null} boardName="Personal" onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onClose).toHaveBeenCalled()
  expect(mockSave.mutate).not.toHaveBeenCalled()
})

test('waits for the settings before showing the form', () => {
  mockLoaded = false
  render(<StatusSettings open folderId={null} boardName="Personal" onClose={jest.fn()} />)
  expect(screen.getByLabelText('Loading')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
})
