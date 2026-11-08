import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import ProjectsScreen from './ProjectsScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
}))
jest.mock('@/components/CreateItem', () => function CreateItemMock() { return null })
jest.mock('@/components/project/ProjectIconDialog', () => function DialogMock() { return null })
jest.mock('@/components/ProjectDetails', () => function DetailsMock() { return null })
// The dialogs own their data hooks and are tested on their own; here they show that they were opened.
jest.mock('@/components/project/NewProjectDialog', () => function NewProjectMock({ onClose }: { onClose: () => void }) {
  return <div role="dialog" aria-label="New project"><button onClick={onClose}>Close</button></div>
})
jest.mock('@/components/project/SaveProjectTypeDialog', () => function SaveTypeMock({ project }: { project: { name: string } }) {
  return <div role="dialog" aria-label="Save as project type">{project.name}</div>
})

const doc = (id: number, title: string) => ({ id, title, doc_type: 'document', updated_at: '2026-10-05T00:00:00Z', content_updated_at: null })
const mockWorkspace = {
  root_folder_id: 1,
  folders: [{
    id: 1, name: 'Root', root: true, kind: 'folder', documents: [doc(1, 'Loose notes')],
    children: [{
      id: 2, name: 'Messages', kind: 'project', documents: [doc(2, 'Background images')],
      children: [{ id: 3, name: 'Design', kind: 'folder', documents: [doc(3, 'Mockups')], children: [] }],
    }],
  }],
}
jest.mock('@/api/workspace', () => ({
  useWorkspace: () => ({ data: mockWorkspace, isLoading: false }),
}))

test('lists each project with the docs inside it, including subfolders', () => {
  render(<ProjectsScreen />)
  expect(screen.getByRole('link', { name: 'Messages' })).toHaveAttribute('href', '/folders/2')
  expect(screen.getByRole('link', { name: 'Background images' })).toHaveAttribute('href', '/documents/2')
  expect(screen.getByRole('link', { name: 'Mockups' })).toBeInTheDocument()
  expect(screen.queryByText('Loose notes')).not.toBeInTheDocument()
  expect(screen.getByText(/2 files/)).toBeInTheDocument()
})

test('New project opens the dialog, which can be closed', () => {
  render(<ProjectsScreen />)
  expect(screen.queryByRole('dialog', { name: 'New project' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'New project' }))
  const dialog = screen.getByRole('dialog', { name: 'New project' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
  expect(screen.queryByRole('dialog', { name: 'New project' })).not.toBeInTheDocument()
})

test('a project card can be saved as a project type', () => {
  render(<ProjectsScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Save Messages as a project type' }))
  expect(within(screen.getByRole('dialog', { name: 'Save as project type' })).getByText('Messages')).toBeInTheDocument()
})

test('the Portfolio button opens the portfolio once there are projects', () => {
  render(<ProjectsScreen />)
  fireEvent.click(screen.getByRole('button', { name: /Portfolio/ }))
  expect(mockNavigate).toHaveBeenCalledWith('/portfolio')
})
