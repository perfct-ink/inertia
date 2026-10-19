import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import ProjectsScreen from './ProjectsScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
}))
jest.mock('@/components/CreateItem', () => function CreateItemMock() { return null })

const mockCreateFolder = { mutate: jest.fn() }
const doc = (id: number, title: string) => ({ id, title, doc_type: 'document', updated_at: '2026-10-05T00:00:00Z', content_updated_at: null })
const mockWorkspace = {
  root_folder_id: 1,
  folders: [{
    id: 1, name: 'Root', root: true, kind: 'folder', documents: [doc(1, 'Loose notes')],
    children: [{
      id: 2, name: 'Messages', kind: 'project', project_type: 'software', documents: [doc(2, 'Background images')],
      children: [{ id: 3, name: 'Design', kind: 'folder', documents: [doc(3, 'Mockups')], children: [] }],
    }],
  }],
}
jest.mock('@/api/workspace', () => ({
  useWorkspace: () => ({ data: mockWorkspace, isLoading: false }),
  useCreateFolder: () => mockCreateFolder,
}))

test('lists each project with the docs inside it, including subfolders', () => {
  render(<ProjectsScreen />)
  expect(screen.getByRole('link', { name: 'Messages' })).toHaveAttribute('href', '/folders/2')
  expect(screen.getByRole('link', { name: 'Background images' })).toHaveAttribute('href', '/documents/2')
  expect(screen.getByRole('link', { name: 'Mockups' })).toBeInTheDocument()
  expect(screen.queryByText('Loose notes')).not.toBeInTheDocument()
  expect(screen.getByText(/2 files/)).toBeInTheDocument()
  expect(screen.getByText('Software')).toBeInTheDocument()
})

test('creates a project from the name typed in', () => {
  render(<ProjectsScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'New project' }))
  const input = screen.getByRole('textbox', { name: 'Project name' })
  fireEvent.change(input, { target: { value: 'Billing' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(mockCreateFolder.mutate).toHaveBeenCalledWith({ name: 'Billing', kind: 'project', project_type: 'blank' }, expect.anything())
})

test('creates a project of the chosen type and shows the type on its card', () => {
  mockCreateFolder.mutate.mockClear()
  render(<ProjectsScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'New project' }))
  fireEvent.change(screen.getByRole('combobox', { name: 'Project type' }), { target: { value: 'music_release' } })
  const input = screen.getByRole('textbox', { name: 'Project name' })
  fireEvent.change(input, { target: { value: 'Debut' } })
  fireEvent.keyDown(input, { key: 'Enter' })
  expect(mockCreateFolder.mutate).toHaveBeenCalledWith({ name: 'Debut', kind: 'project', project_type: 'music_release' }, expect.anything())
})
