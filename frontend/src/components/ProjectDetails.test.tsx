import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import ProjectDetails from './ProjectDetails'

const mockUpdate = { mutate: jest.fn() }
jest.mock('@/api/workspace', () => ({ useUpdateFolder: () => mockUpdate }))
jest.mock('@/api/workspaces', () => ({
  useWorkspaceMembers: () => ({ data: [{ user_id: 7, user: { id: 7, name: 'Sam', email: 's@x.co' } }] }),
}))

const project = { id: 2, name: 'Album', kind: 'project', project_status: 'planned', owner_id: null, start_date: null, target_date: null, description: null } as never

afterEach(() => jest.clearAllMocks())

test('saves owner, status, dates and description', () => {
  render(<ProjectDetails project={project} />)
  fireEvent.change(screen.getByLabelText('Owner'), { target: { value: '7' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 2, owner_id: 7 }, expect.anything())
  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'active' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 2, project_status: 'active' }, expect.anything())
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-11-01' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 2, start_date: '2026-11-01' }, expect.anything())
  fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2026-12-01' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 2, target_date: '2026-12-01' }, expect.anything())
  const description = screen.getByLabelText('Description')
  fireEvent.change(description, { target: { value: 'Ten songs' } })
  fireEvent.blur(description)
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 2, description: 'Ten songs' }, expect.anything())
})
