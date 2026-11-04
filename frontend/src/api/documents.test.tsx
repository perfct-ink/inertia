import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTabsStore } from '@/store/tabs'
import { useUpdateDocument } from './documents'

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: { patch: jest.fn((_url: string, body: { document: { title: string } }) => Promise.resolve({ data: { id: 5, title: body.document.title } })) },
}))

test('renaming a document, from anywhere, renames its open tab', async () => {
  useTabsStore.getState().openTab({ id: '5', path: '/documents/5', title: 'Budget', docType: 'spreadsheet' })
  const qc = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  const { result } = renderHook(() => useUpdateDocument(), { wrapper })
  await act(() => result.current.mutateAsync({ id: 5, title: 'Budget 2027' }))
  await waitFor(() => expect(useTabsStore.getState().tabs[0].title).toBe('Budget 2027'))
})
