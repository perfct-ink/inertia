import { renderHook } from '@testing-library/react'
import { useNewDocument } from './useNewDocument'

const mockCreateDocument = jest.fn().mockResolvedValue({ id: 9 })
const mockCreateFolder = jest.fn().mockResolvedValue({ id: 77, name: 'Personal Project', kind: 'project' })
const mockSelect = jest.fn()
const mockNavigate = jest.fn()
let mockFolders: unknown[] = []

jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: { root_folder_id: 1, folders: mockFolders } }) }))
jest.mock('@/api/documents', () => ({ useCreateDocument: () => ({ mutateAsync: mockCreateDocument }) }))
jest.mock('@/api/folders', () => ({ useCreateFolder: () => ({ mutateAsync: mockCreateFolder }) }))
jest.mock('@/hooks/useSelectProject', () => ({ useSelectProject: () => mockSelect }))
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))

const folder = (id: number, name: string, kind = 'folder') => ({ id, name, kind, archived: false, documents: [], children: [] })

afterEach(() => { jest.clearAllMocks(); mockFolders = [] })

test('with no folder, a Personal Project is created, opened and used', async () => {
  mockFolders = [folder(1, 'Root')]
  await renderHook(() => useNewDocument()).result.current('document')
  expect(mockCreateFolder).toHaveBeenCalledWith({ name: 'Personal Project', kind: 'project', project_type: 'personal' })
  expect(mockSelect).toHaveBeenCalledWith(77)
  expect(mockCreateDocument).toHaveBeenCalledWith({ folderId: 77, title: 'Untitled Document', doc_type: 'document' })
  expect(mockNavigate).toHaveBeenCalledWith('/documents/9', { state: { focusTitle: true } })
})

test('an existing Personal Project is reused', async () => {
  mockFolders = [{ ...folder(1, 'Root'), children: [folder(5, 'Personal Project', 'project')] }]
  await renderHook(() => useNewDocument()).result.current('spreadsheet')
  expect(mockCreateFolder).not.toHaveBeenCalled()
  expect(mockCreateDocument).toHaveBeenCalledWith({ folderId: 5, title: 'Untitled Sheet', doc_type: 'spreadsheet' })
})

test('a given folder is used as is', async () => {
  await renderHook(() => useNewDocument()).result.current('document', 12)
  expect(mockCreateFolder).not.toHaveBeenCalled()
  expect(mockCreateDocument).toHaveBeenCalledWith({ folderId: 12, title: 'Untitled Document', doc_type: 'document' })
})
