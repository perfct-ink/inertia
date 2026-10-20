import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import FeatureBar from './FeatureBar'

const mockUpdate = { mutate: jest.fn() }
jest.mock('@/api/documents', () => ({ useUpdateDocument: () => mockUpdate }))
jest.mock('@/api/epics', () => ({ useEpics: () => ({ data: [{ id: 3, title: 'Images' }] }) }))
jest.mock('@/api/milestones', () => ({ useMilestones: () => ({ data: [{ id: 4, title: 'Beta' }] }) }))
jest.mock('@/api/workspaces', () => ({ useWorkspaceMembers: () => ({ data: [{ user_id: 7, user: { name: 'Sam' } }] }) }))
jest.mock('@/api/workspace', () => ({
  useWorkspace: () => ({
    data: { folders: [{ id: 1, name: 'Root', root: true, kind: 'folder', documents: [], children: [
      { id: 2, name: 'Features', kind: 'feature', children: [], documents: [{ id: 10, title: 'Parent', doc_type: 'document', folder_id: 2 }, { id: 11, title: 'Child', doc_type: 'document', folder_id: 2 }] },
    ] }] },
  }),
}))
jest.mock('@/store/workspaces', () => ({ useWorkspaceStore: (select: (s: { activeWorkspaceId: number }) => unknown) => select({ activeWorkspaceId: 1 }) }))

afterEach(() => jest.clearAllMocks())

test('only shows for a document in a feature folder', () => {
  const { container } = render(<FeatureBar doc={{ id: 99, folder_id: 1, doc_type: 'document' } as never} />)
  expect(container).toBeEmptyDOMElement()
})

test('sets the parent, status, owner, epic and milestone', () => {
  render(<FeatureBar doc={{ id: 11, folder_id: 2, doc_type: 'document' } as never} />)
  fireEvent.change(screen.getByLabelText('Parent feature'), { target: { value: '10' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 11, parent_feature_id: 10 }, expect.anything())
  fireEvent.change(screen.getByLabelText('Feature status'), { target: { value: 'done' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 11, feature_status: 'done' }, expect.anything())
  fireEvent.change(screen.getByLabelText('Feature owner'), { target: { value: '7' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 11, feature_owner_id: 7 }, expect.anything())
  fireEvent.change(screen.getByLabelText('Feature epic'), { target: { value: '3' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 11, epic_id: 3 }, expect.anything())
  fireEvent.change(screen.getByLabelText('Feature milestone'), { target: { value: '4' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 11, milestone_id: 4 }, expect.anything())
})

test('the parent menu leaves out the feature itself', () => {
  render(<FeatureBar doc={{ id: 11, folder_id: 2, doc_type: 'document' } as never} />)
  const options = Array.from((screen.getByLabelText('Parent feature') as HTMLSelectElement).options).map((o) => o.textContent)
  expect(options).toEqual(['No parent feature', 'Parent'])
})
