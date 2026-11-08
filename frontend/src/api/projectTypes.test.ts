import { folderApi } from './folders'
import { projectTypeApi } from './projectTypes'
import { PROJECT_TYPES, projectStart } from '@/data/projectType'

const mockApi = { post: jest.fn(), get: jest.fn(), delete: jest.fn() }
jest.mock('@/lib/api', () => ({ __esModule: true, default: { post: (...args: unknown[]) => mockApi.post(...args), get: (...args: unknown[]) => mockApi.get(...args), delete: (...args: unknown[]) => mockApi.delete(...args) } }))

beforeEach(() => {
  jest.clearAllMocks()
  mockApi.post.mockResolvedValue({ data: { id: 5 } })
})

test('a project of a built-in type is posted with its type, icon and template alongside the folder', async () => {
  await folderApi.createProject('Debut', projectStart('music_release'))
  const [path, body] = mockApi.post.mock.calls[0]
  const music = PROJECT_TYPES.find((t) => t.key === 'music_release')!
  expect(path).toBe('/api/v1/folders')
  expect(body).toEqual({ folder: { name: 'Debut', kind: 'project', project_type: 'music_release', icon: music.icon }, template: music.template })
})

test('a blank project or one of a saved type sends no template', async () => {
  await folderApi.createProject('Plain', projectStart('blank'))
  expect(mockApi.post.mock.calls[0][1]).toEqual({ folder: { name: 'Plain', kind: 'project', project_type: 'blank' } })
  await folderApi.createProject('Season 2', projectStart('custom_7'))
  expect(mockApi.post.mock.calls[1][1]).toEqual({ folder: { name: 'Season 2', kind: 'project', project_type: 'custom_7' } })
})

test('saving a project as a type posts it under project_type, and a type is deleted by id', async () => {
  await projectTypeApi.create({ name: 'Release', from_folder_id: 2 })
  expect(mockApi.post).toHaveBeenCalledWith('/api/v1/project_types', { project_type: { name: 'Release', from_folder_id: 2 } })
  await projectTypeApi.destroy(7)
  expect(mockApi.delete).toHaveBeenCalledWith('/api/v1/project_types/7')
  mockApi.get.mockResolvedValue({ data: [] })
  await projectTypeApi.list()
  expect(mockApi.get).toHaveBeenCalledWith('/api/v1/project_types', { params: undefined })
})
