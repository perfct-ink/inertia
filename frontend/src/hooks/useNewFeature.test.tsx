import { renderHook } from '@testing-library/react'
import { useNewFeature } from './useNewFeature'

const mockCreateEpic = jest.fn()
const mockCreateFolder = jest.fn().mockResolvedValue({ id: 77, name: 'Personal Project', kind: 'project' })
const mockSelect = jest.fn()
const mockNavigate = jest.fn()
let mockFolders: unknown[] = []

jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: { root_folder_id: 1, folders: mockFolders } }) }))
jest.mock('@/api/epics', () => ({ useCreateEpic: () => ({ mutateAsync: mockCreateEpic }) }))
jest.mock('@/api/folders', () => ({ useCreateFolder: () => ({ mutateAsync: mockCreateFolder }) }))
jest.mock('@/hooks/useSelectProject', () => ({ useSelectProject: () => mockSelect }))
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))

const folder = (id: number, name: string, kind = 'folder') => ({ id, name, kind, archived: false, documents: [], children: [] })

beforeEach(() => { mockCreateEpic.mockResolvedValue({ id: 4, title: 'Messages', document_id: 31 }) })
afterEach(() => { jest.clearAllMocks(); mockFolders = [] })

test('makes the feature in the given folder and opens its requirements document', async () => {
  const epic = await renderHook(() => useNewFeature()).result.current('Messages', 12)
  expect(mockCreateEpic).toHaveBeenCalledWith({ title: 'Messages', folder_id: 12 })
  expect(mockCreateFolder).not.toHaveBeenCalled()
  expect(mockNavigate).toHaveBeenCalledWith('/documents/31')
  expect(epic.id).toBe(4)
})

test('with no folder the feature goes in a new Personal Project, which is opened', async () => {
  mockFolders = [folder(1, 'Root')]
  await renderHook(() => useNewFeature()).result.current('Messages')
  expect(mockCreateFolder).toHaveBeenCalledWith({ name: 'Personal Project', kind: 'project' })
  expect(mockSelect).toHaveBeenCalledWith(77)
  expect(mockCreateEpic).toHaveBeenCalledWith({ title: 'Messages', folder_id: 77 })
})

test('an existing Personal Project is reused', async () => {
  mockFolders = [{ ...folder(1, 'Root'), children: [folder(5, 'Personal Project', 'project')] }]
  await renderHook(() => useNewFeature()).result.current('Messages')
  expect(mockCreateFolder).not.toHaveBeenCalled()
  expect(mockCreateEpic).toHaveBeenCalledWith({ title: 'Messages', folder_id: 5 })
})

test('stays where it is when the feature has no document', async () => {
  mockCreateEpic.mockResolvedValue({ id: 4, title: 'Messages', document_id: null })
  await renderHook(() => useNewFeature()).result.current('Messages', 12)
  expect(mockNavigate).not.toHaveBeenCalled()
})

test('a failed create reaches the caller and opens nothing', async () => {
  mockCreateEpic.mockRejectedValue(new Error('Title can’t be blank'))
  await expect(renderHook(() => useNewFeature()).result.current('', 12)).rejects.toThrow('Title can’t be blank')
  expect(mockNavigate).not.toHaveBeenCalled()
})
