import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import FolderDetailScreen from './FolderDetailScreen'
import type { TaskStatusSetting } from '@/types'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
jest.mock('@/components/CreateItem', () => function CreateItemMock() { return null })
jest.mock('@/components/FeatureRollup', () => function FeatureRollupMock() { return null })
jest.mock('./GanttPane', () => function GanttPaneMock() { return null })

const mockUpdate = { mutate: jest.fn() }
let mockRole = 'member'
const mockWorkspace = {
  get role() { return mockRole },
  folders: [{ id: 1, name: 'Root', root: true, parent_id: null, documents: [], children: [{ id: 2, name: 'Messages', root: false, parent_id: 1, documents: [], children: [] }] }],
}
const task = (id: number, title: string, status: string) => ({ id, title, status, parent_id: null, due_date: null, document_id: 1 })
const docItem = (id: number, title: string, doc_type = 'document') => ({ id, title, doc_type, folder_id: 2 })
const subfolder = (id: number, name: string, kind = 'folder') => ({ id, name, kind, parent_id: 2 })
const baseContents = {
  folder: { id: 2, name: 'Messages', archived: false, dependency_mode: 'none' },
  folders: [] as ReturnType<typeof subfolder>[],
  documents: [] as ReturnType<typeof docItem>[],
  tasks: [task(1, 'Write copy', 'todo'), task(2, 'Ship it', 'in_progress')],
  events: [],
  epics: [],
}
let mockContents = baseContents
let mockFailed = false
jest.mock('@/api/folders', () => ({
  useFolderContents: () => ({ data: mockFailed ? undefined : mockContents, isLoading: false, isError: mockFailed }),
  useUpdateFolder: () => mockUpdate,
}))
jest.mock('@/api/workspace', () => ({
  useWorkspace: () => ({ data: mockWorkspace }),
}))
jest.mock('@/api/tasks', () => ({ useUpdateTask: () => mockUpdate }))
jest.mock('@/api/milestones', () => ({ useMilestones: () => ({ data: [] }) }))
jest.mock('@/api/initiatives', () => ({ useInitiatives: () => ({ data: [] }) }))

let mockSettings: TaskStatusSetting[] = []
jest.mock('@/api/taskStatusSettings', () => ({
  useTaskStatusSettings: () => ({ data: mockSettings, isSuccess: true }),
  useSaveTaskStatusSettings: () => ({ mutate: jest.fn(), isPending: false }),
  useResetTaskStatusSettings: () => ({ mutate: jest.fn(), isPending: false }),
}))

function renderScreen(view: string) {
  return render(
    <MemoryRouter initialEntries={[`/folders/2?view=${view}`]}>
      <Routes><Route path="/folders/:id" element={<FolderDetailScreen />} /></Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockRole = 'member'
  mockSettings = []
  mockContents = baseContents
  mockFailed = false
})

test('a folder that fails to load says so instead of spinning forever', () => {
  mockFailed = true
  renderScreen('overview')
  expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load this folder.")
})

test('the overview lists the folders and documents directly inside the folder', () => {
  mockContents = { ...baseContents, folders: [subfolder(5, 'Design'), subfolder(6, 'Launch', 'project')], documents: [docItem(10, 'Brief')] }
  renderScreen('overview')
  expect(screen.getByRole('heading', { name: 'Folders' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Design' })).toHaveAttribute('href', '/folders/5')
  expect(screen.getByRole('link', { name: 'Launch' })).toHaveAttribute('href', '/folders/6')
  expect(screen.getByRole('link', { name: 'Brief' })).toHaveAttribute('href', '/documents/10')
})

test('the overview shows no Folders section when nothing is nested directly inside', () => {
  mockContents = { ...baseContents, documents: [docItem(10, 'Brief')] }
  renderScreen('overview')
  expect(screen.queryByRole('heading', { name: 'Folders' })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Brief' })).toBeInTheDocument()
})

test('the other views keep the folders and documents in the row above them', () => {
  mockContents = { ...baseContents, folders: [subfolder(5, 'Design')], documents: [docItem(10, 'Brief')] }
  renderScreen('board')
  expect(screen.getByRole('link', { name: 'Design' })).toHaveAttribute('href', '/folders/5')
  expect(screen.getByRole('link', { name: 'Brief' })).toHaveAttribute('href', '/documents/10')
})

test('the other views show no row when the folder is empty', () => {
  renderScreen('board')
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})

test('the board names its columns and the move arrow with the built-in statuses by default', () => {
  renderScreen('board')
  expect(screen.getByText('In Progress')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Move to In Progress' })).toBeInTheDocument()
})

test('the board uses the names the Space and the folder gave the statuses', () => {
  mockSettings = [
    { id: 1, folder_id: null, status: 'in_progress', label: 'Doing', color: null },
    { id: 2, folder_id: 2, status: 'todo', label: 'Queued', color: 'red' },
  ]
  renderScreen('board')
  expect(screen.getByText('Queued')).toBeInTheDocument()
  expect(screen.getByText('Doing')).toBeInTheDocument()
  expect(screen.queryByText('To Do')).not.toBeInTheDocument()
  // The arrow on the "Queued" card moves it to the renamed next column.
  expect(screen.getByRole('button', { name: 'Move to Doing' })).toBeInTheDocument()
})

test('the list shows the configured name beside each task', () => {
  mockSettings = [{ id: 1, folder_id: 2, status: 'in_progress', label: 'Doing', color: null }]
  renderScreen('list')
  expect(screen.getByText('Doing')).toBeInTheDocument()
  expect(screen.getByText('To Do')).toBeInTheDocument()
})

test('members can open the status editor from the board; viewers and other views do not get it', () => {
  const { unmount } = renderScreen('board')
  fireEvent.click(screen.getByRole('button', { name: 'Statuses' }))
  expect(screen.getByRole('dialog', { name: 'Statuses for Messages' })).toBeInTheDocument()
  expect(within(screen.getByRole('dialog')).getByRole('textbox', { name: 'Name for To Do' })).toBeInTheDocument()
  unmount()

  mockRole = 'viewer'
  const viewer = renderScreen('board')
  expect(screen.queryByRole('button', { name: 'Statuses' })).not.toBeInTheDocument()
  viewer.unmount()

  mockRole = 'member'
  renderScreen('gantt')
  expect(screen.queryByRole('button', { name: 'Statuses' })).not.toBeInTheDocument()
})
