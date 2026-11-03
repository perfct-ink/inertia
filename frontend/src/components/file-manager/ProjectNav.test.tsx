import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { useProjectStore } from '@/store/projects'
import { ProjectNav } from './ProjectNav'

jest.mock('./FolderItem', () => ({ FolderItem: ({ folder }: { folder: { name: string } }) => <p>Files of {folder.name}</p> }))
jest.mock('@/components/project/ProjectIconDialog', () => function DialogMock() { return null })
jest.mock('@/api/folders', () => ({ useCreateFolder: () => ({ mutateAsync: jest.fn() }) }))

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

test('selecting a project shows its pages and files in place of the list, with a project dropdown', () => {
  renderAt('/space')
  fireEvent.click(screen.getByRole('button', { name: 'Messages' }))
  expect(useProjectStore.getState().activeProjectId).toBe(2)
  expect(mockReset).toHaveBeenCalled()
  expect(screen.getByTestId('where')).toHaveTextContent('/folders/2')
  const pages = screen.getByRole('navigation', { name: 'Messages pages' })
  expect(pages).toHaveTextContent('Overview')
  expect(screen.getByRole('group', { name: 'Goals' })).toHaveTextContent('OKRs')
  // Its files come first, before its pages.
  const files = screen.getByText('Files of Messages')
  expect(files.compareDocumentPosition(pages) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Billing' })).not.toBeInTheDocument()

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

test('opening a document inside a project opens that project', () => {
  renderAt('/documents/9')
  expect(useProjectStore.getState().activeProjectId).toBe(2)
  expect(screen.getByRole('navigation', { name: 'Messages pages' })).toBeInTheDocument()
})
