import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import api from '@/lib/api'
import { useAttachTaskFile, useDetachTaskFile } from './tasks'

jest.mock('@/lib/api', () => ({ __esModule: true, default: { post: jest.fn(), delete: jest.fn() } }))
const mockApi = api as unknown as { post: jest.Mock; delete: jest.Mock }

function setup() {
  const qc = new QueryClient()
  const invalidate = jest.spyOn(qc, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  return { wrapper, invalidate }
}

afterEach(() => jest.clearAllMocks())

test('attaching posts the file id to the task and refetches the tasks', async () => {
  mockApi.post.mockResolvedValue({ data: { id: 3, file_ids: [9] } })
  const { wrapper, invalidate } = setup()
  const { result } = renderHook(() => useAttachTaskFile(), { wrapper })
  await act(() => result.current.mutateAsync({ taskId: 3, fileId: 9 }))
  expect(mockApi.post).toHaveBeenCalledWith('/api/v1/tasks/3/files', { file_id: 9 })
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tasks'] })
})

test('detaching deletes the link by the file id and refetches the tasks', async () => {
  mockApi.delete.mockResolvedValue({ data: { id: 3, file_ids: [] } })
  const { wrapper, invalidate } = setup()
  const { result } = renderHook(() => useDetachTaskFile(), { wrapper })
  await act(() => result.current.mutateAsync({ taskId: 3, fileId: 9 }))
  expect(mockApi.delete).toHaveBeenCalledWith('/api/v1/tasks/3/files/9')
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tasks'] })
})
