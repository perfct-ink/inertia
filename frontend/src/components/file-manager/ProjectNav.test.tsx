import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
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
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ resetQueries: mockReset }) }))

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
  expect(screen.queryByRole('link', { name: 'Tasks' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Messages' })).not.toHaveAttribute('aria-expanded')
})

test('selecting a project shows it in place of the list, with Files and Pages tabs and a project dropdown', () => {
  renderAt('/space')
  fireEvent.click(screen.getByRole('button', { name: 'Messages' }))
  expect(useProjectStore.getState().activeProjectId).toBe(2)
  expect(mockReset).toHaveBeenCalled()
  expect(screen.getByTestId('where')).toHaveTextContent('/folders/2')
  expect(screen.queryByRole('button', { name: 'Billing' })).not.toBeInTheDocument()

  // The Overview is a page, so Pages is the open tab there.
  expect(screen.getByRole('tab', { name: 'Pages' })).toHaveAttribute('aria-selected', 'true')
  const pages = screen.getByRole('navigation', { name: 'Messages pages' })
  expect(pages).toHaveTextContent('Overview')
  expect(screen.getByRole('group', { name: 'Goals' })).toHaveTextContent('OKRs')
  expect(screen.queryByText('Files of Messages')).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('tab', { name: 'Files' }))
  expect(screen.getByText('Files of Messages')).toBeInTheDocument()
  expect(screen.queryByRole('navigation', { name: 'Messages pages' })).not.toBeInTheDocument()

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
  fireEvent.click(screen.getByRole('tab', { name: 'Files' }))
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

test('opening a document inside a project opens that project on its Files tab', () => {
  renderAt('/documents/9')
  expect(useProjectStore.getState().activeProjectId).toBe(2)
  expect(screen.getByRole('tab', { name: 'Files' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByText('Files of Messages')).toBeInTheDocument()
})

test('the projects list leads to all files and to archived items, not other files', () => {
  renderAt('/space')
  expect(screen.queryByText('Other files')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Show archived' }))
  expect(screen.getByText('Nothing archived.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'All files' }))
  expect(screen.getByTestId('where')).toHaveTextContent('/documents')
})
