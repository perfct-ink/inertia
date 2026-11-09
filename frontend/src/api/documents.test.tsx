import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTabsStore } from '@/store/tabs'
import api from '@/lib/api'
import { documentApi, useBacklinks, useDocumentLinkTargets, useUpdateDocument } from './documents'

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    patch: jest.fn((_url: string, body: { document: { title: string } }) => Promise.resolve({ data: { id: 5, title: body.document.title } })),
    get: jest.fn((url: string) => Promise.resolve({ data: url.endsWith('/backlinks') ? [{ id: 9, title: 'Plan' }] : [{ id: 2, doc_type: 'document', headings: [] }] })),
  },
}))

test('renaming a document, from anywhere, renames its open tab', async () => {
  useTabsStore.getState().openTab({ id: '5', path: '/documents/5', title: 'Budget', docType: 'spreadsheet' })
  const qc = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  const { result } = renderHook(() => useUpdateDocument(), { wrapper })
  await act(() => result.current.mutateAsync({ id: 5, title: 'Budget 2027' }))
  await waitFor(() => expect(useTabsStore.getState().tabs[0].title).toBe('Budget 2027'))
})

describe('link targets', () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  )
  beforeEach(() => { (api.get as jest.Mock).mockClear() })

  test('one request asks about every linked document', async () => {
    await expect(documentApi.linkTargets([2, 3, 4])).resolves.toEqual([{ id: 2, doc_type: 'document', headings: [] }])
    expect(api.get).toHaveBeenCalledTimes(1)
    expect(api.get).toHaveBeenCalledWith('/api/v1/documents/link_targets', expect.objectContaining({ params: { ids: '2,3,4' } }))
  })

  test('the hook answers with the documents asked about and the ones found', async () => {
    const { result } = renderHook(() => useDocumentLinkTargets([2, 3]), { wrapper })
    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(result.current.data).toEqual({ asked: [2, 3], found: [{ id: 2, doc_type: 'document', headings: [] }] })
    expect(api.get).toHaveBeenCalledTimes(1)
  })

  test('the hook asks nothing when the document links to no other document', () => {
    renderHook(() => useDocumentLinkTargets([]), { wrapper })
    expect(api.get).not.toHaveBeenCalled()
  })
})

test('backlinks are read from the document\'s backlinks endpoint', async () => {
  await expect(documentApi.backlinks(7)).resolves.toEqual([{ id: 9, title: 'Plan' }])
  expect(api.get).toHaveBeenCalledWith('/api/v1/documents/7/backlinks')

  const qc = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  const { result } = renderHook(() => useBacklinks(7), { wrapper })
  await waitFor(() => expect(result.current.data).toEqual([{ id: 9, title: 'Plan' }]))
})
