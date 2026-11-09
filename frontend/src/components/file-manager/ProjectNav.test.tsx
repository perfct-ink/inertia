import '@testing-library/jest-dom'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useProjectStore } from '@/store/projects'
import { ProjectNav } from './ProjectNav'

jest.mock('./FolderItem', () => ({ FolderItem: ({ folder }: { folder: { name: string } }) => <p>Files of {folder.name}</p> }))
jest.mock('@/components/project/ProjectIconDialog', () => function DialogMock() { return null })
const mockNewDocument = jest.fn()
jest.mock('@/hooks/useNewDocument', () => ({ useNewDocument: () => mockNewDocument }))
const mockCreateFolder = jest.fn()
jest.mock('@/api/folders', () => ({
  useCreateFolder: () => ({ mutateAsync: jest.fn(), mutate: mockCreateFolder }),
  useUpdateFolder: () => ({ mutate: jest.fn() }),
  useArchivedFolders: () => ({ data: [] }),
}))

const mockReset = jest.fn()
// One client object, as in the app: a new one per render would make selectProject change every render.
const mockClient = { resetQueries: mockReset }
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => mockClient }))

const doc = { id: 9, title: 'Brief', doc_type: 'document' }
const mockWorkspace = {
  folders: [{
    id: 1, name: 'Root', root: true, kind: 'folder', documents: [],
    children: [
      { id: 2, name: 'Messages', kind: 'project', icon: '🚀', documents: [doc], children: [] },
      { id: 3, name: 'Billing', kind: 'project', documents: [], children: [] },
      { id: 4, name: 'Loose', kind: 'folder', documents: [], children: [] },
    ],
  }],
}
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: mockWorkspace }) }))

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="*" element={<><ProjectNav /><Where /></>} /></Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useProjectStore.setState({ activeProjectId: null })
  mockReset.mockClear()
})

test('the projects list is flat: projects only, no pages or files', () => {
  renderAt('/space')
  expect(screen.getByRole('button', { name: 'Messages' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Billing' })).toBeInTheDocument()
  expect(screen.queryByText('Loose')).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Roadmap' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Messages' })).not.toHaveAttribute('aria-expanded')
})

test('selecting a project shows its files in place of the list, with a project dropdown', () => {
  renderAt('/space')
  fireEvent.click(screen.getByRole('button', { name: 'Messages' }))
  expect(useProjectStore.getState().activeProjectId).toBe(2)
  expect(mockReset).toHaveBeenCalled()
  expect(screen.getByTestId('where')).toHaveTextContent('/folders/2')
  expect(screen.queryByRole('button', { name: 'Billing' })).not.toBeInTheDocument()

  // Just its files: no tabs, and its pages are on the icon rail.
  expect(screen.getByRole('button', { name: 'All files' })).toBeInTheDocument()
  expect(screen.getByText('Files of Messages')).toBeInTheDocument()
  expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'Roadmap' })).not.toBeInTheDocument()

  // The dropdown opens the project's overview.
  fireEvent.click(screen.getByRole('button', { name: 'Project: Messages. Switch project' }))
  fireEvent.click(screen.getByRole('menuitem', { name: /Overview/ }))
  expect(screen.getByTestId('where')).toHaveTextContent('/folders/2')

  // The open project's dropdown switches projects or goes back to them all.
  fireEvent.click(screen.getByRole('button', { name: 'Project: Messages. Switch project' }))
  expect(screen.getByRole('menuitemradio', { name: /Messages/ })).toHaveAttribute('aria-checked', 'true')
  fireEvent.click(screen.getByRole('menuitemradio', { name: /Billing/ }))
  expect(useProjectStore.getState().activeProjectId).toBe(3)
  expect(screen.getByTestId('where')).toHaveTextContent('/folders/3')

  fireEvent.click(screen.getByRole('button', { name: 'Project: Billing. Switch project' }))
  fireEvent.click(screen.getByRole('menuitem', { name: /All projects/ }))
  expect(screen.getByTestId('where')).toHaveTextContent('/space')
  expect(screen.getByRole('button', { name: 'Billing' })).toBeInTheDocument()
})

test('a project with no files says so', () => {
  useProjectStore.setState({ activeProjectId: 3 })
  renderAt('/folders/3')
  expect(screen.getByText('No files yet.')).toBeInTheDocument()
})

test('the Files tab creates documents, sheets, Collections and folders in the project', () => {
  useProjectStore.setState({ activeProjectId: 2 })
  renderAt('/documents/9')
  fireEvent.click(screen.getByRole('button', { name: 'New document' }))
  fireEvent.click(screen.getByRole('button', { name: 'New sheet' }))
  fireEvent.click(screen.getByRole('button', { name: 'New Collection' }))
  expect(mockNewDocument.mock.calls).toEqual([['document', 2], ['spreadsheet', 2], ['table', 2]])

  fireEvent.click(screen.getByRole('button', { name: 'New folder' }))
  const name = screen.getByRole('textbox', { name: 'Folder name' })
  fireEvent.change(name, { target: { value: 'Drafts' } })
  fireEvent.keyDown(name, { key: 'Enter' })
  expect(mockCreateFolder).toHaveBeenCalledWith({ name: 'Drafts', parent_id: 2 }, expect.anything())
})

test('with a project open, All files replaces the Files heading and keeps the project open', () => {
  renderAt('/documents/9')
  expect(screen.queryByText('Files')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'All files' }))
  expect(screen.getByTestId('where')).toHaveTextContent('/documents')
  expect(useProjectStore.getState().activeProjectId).toBe(2)
  expect(screen.getByRole('button', { name: 'New document' })).toBeInTheDocument()
})

test('the task pages are listed with their names inside a project, not on the projects list', () => {
  renderAt('/space')
  expect(screen.queryByRole('navigation', { name: 'Tasks' })).not.toBeInTheDocument()
  cleanup()
  useProjectStore.setState({ activeProjectId: 2 })
  renderAt('/task-table')
  const tasks = screen.getByRole('navigation', { name: 'Tasks' })
  ;['Tasks', 'Task table', 'Pivot', 'Calendar', 'Events', 'Forms'].forEach((name) => expect(within(tasks).getByRole('link', { name })).toBeInTheDocument())
  expect(within(tasks).getByRole('link', { name: 'Task table' })).toHaveAttribute('aria-current', 'page')
  fireEvent.click(within(tasks).getByRole('link', { name: 'Pivot' }))
  expect(screen.getByTestId('where')).toHaveTextContent('/pivot')
})

test('opening a document inside a project opens that project', () => {
  renderAt('/documents/9')
  expect(useProjectStore.getState().activeProjectId).toBe(2)
  expect(screen.getByText('Files of Messages')).toBeInTheDocument()
})

test('the projects list leads to all files and to archived items, not other files or project requests', () => {
  renderAt('/space')
  expect(screen.queryByText('Other files')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Project requests' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Show archived' }))
  expect(screen.getByText('Nothing archived.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'All files' }))
  expect(screen.getByTestId('where')).toHaveTextContent('/documents')
})
