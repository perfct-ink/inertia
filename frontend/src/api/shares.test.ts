import { shareApi } from './shares'

const mockPost = jest.fn()
const mockGet = jest.fn()
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { post: (...args: unknown[]) => mockPost(...args), get: (...args: unknown[]) => mockGet(...args) },
}))

beforeEach(() => {
  mockPost.mockResolvedValue({ data: { id: 1, token: 'abc' } })
  mockGet.mockResolvedValue({ data: [] })
})
afterEach(() => jest.clearAllMocks())

test('makes a view-only link for a document, with its expiry', async () => {
  await expect(shareApi.createFor({ kind: 'document', id: 7, name: 'Plan' }, { expires_in_days: '30' })).resolves.toEqual({ id: 1, token: 'abc' })
  expect(mockPost).toHaveBeenCalledWith('/api/v1/shares', { document_id: 7, share: { permission: 'view', expires_in_days: '30' } })
})

test('makes a link for a folder that never expires', async () => {
  await shareApi.createFor({ kind: 'folder', id: 3, name: 'Plans' }, { expires_in_days: '' })
  expect(mockPost).toHaveBeenCalledWith('/api/v1/shares', { folder_id: 3, share: { permission: 'view', expires_in_days: '' } })
})

test('lists the links of one document or folder', async () => {
  await shareApi.list({ document_id: 7 })
  expect(mockGet).toHaveBeenCalledWith('/api/v1/shares', { params: { document_id: 7 } })
})
