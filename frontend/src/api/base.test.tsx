import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import api from '@/lib/api'
import { ApiResource, useResourceCreate, useResourceDelete, useResourceFind, useResourceList, useResourceUpdate } from './base'

interface Thing { id: number; title: string }

class ThingApi extends ApiResource<Thing, { title: string }> {
  constructor() {
    super('/api/v1/things', 'thing', 'things')
  }
}
const things = new ThingApi()
const flat = new ApiResource<Thing, { title: string }>('/api/v1/flat', null, 'flat')

let requests: { method?: string; url?: string; params?: unknown; body: unknown }[]
const originalAdapter = api.defaults.adapter

beforeEach(() => {
  requests = []
  const adapter: AxiosAdapter = (config: InternalAxiosRequestConfig) => {
    requests.push({ method: config.method, url: config.url, params: config.params, body: config.data ? JSON.parse(config.data) : undefined })
    const data = config.method === 'get' && config.url === '/api/v1/things' ? [{ id: 1, title: 'A' }] : { id: 1, title: 'A' }
    return Promise.resolve({ data, status: 200, statusText: 'OK', headers: {}, config })
  }
  api.defaults.adapter = adapter
})

afterEach(() => {
  api.defaults.adapter = originalAdapter
})

describe('ApiResource', () => {
  test('lists with filters as query params', async () => {
    await expect(things.list({ q: 'a' })).resolves.toEqual([{ id: 1, title: 'A' }])
    expect(requests).toEqual([{ method: 'get', url: '/api/v1/things', params: { q: 'a' }, body: undefined }])
  })

  test('finds one record by id', async () => {
    await things.find(5)
    expect(requests[0]).toMatchObject({ method: 'get', url: '/api/v1/things/5' })
  })

  test('creates with the fields under the Rails param key', async () => {
    await things.create({ title: 'B' })
    expect(requests[0]).toMatchObject({ method: 'post', url: '/api/v1/things', body: { thing: { title: 'B' } } })
  })

  test('updates by id with the fields under the Rails param key', async () => {
    await things.update(5, { title: 'C' })
    expect(requests[0]).toMatchObject({ method: 'patch', url: '/api/v1/things/5', body: { thing: { title: 'C' } } })
  })

  test('deletes by id', async () => {
    await things.destroy(5)
    expect(requests[0]).toMatchObject({ method: 'delete', url: '/api/v1/things/5' })
  })

  test('a resource without a param key sends the fields as the body', async () => {
    await flat.create({ title: 'B' })
    expect(requests[0]).toMatchObject({ method: 'post', url: '/api/v1/flat', body: { title: 'B' } })
  })
})

describe('resource hooks', () => {
  let client: QueryClient
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>

  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  })

  test('the list is cached under the resource key, with the filters when there are some', async () => {
    const { result } = renderHook(() => useResourceList(things, { params: { q: 'a' } }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([{ id: 1, title: 'A' }])
    expect(client.getQueryCache().find({ queryKey: ['things', { q: 'a' }] })).toBeDefined()
  })

  test('the list keeps the app default staleTime unless one is given', async () => {
    client.setDefaultOptions({ queries: { staleTime: 60_000 } })
    const { result } = renderHook(() => useResourceList(things), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.getQueryCache().find({ queryKey: ['things'] })?.isStale()).toBe(false)
    const fresh = renderHook(() => useResourceList(things, { staleTime: 0, params: { q: 'b' } }), { wrapper })
    await waitFor(() => expect(fresh.result.current.isSuccess).toBe(true))
    expect(client.getQueryCache().find({ queryKey: ['things', { q: 'b' }] })?.isStale()).toBe(true)
  })

  test('a disabled list stays idle, and a refetch interval reaches the query', async () => {
    const idle = renderHook(() => useResourceList(things, { enabled: false }), { wrapper })
    expect(idle.result.current.fetchStatus).toBe('idle')
    expect(requests).toEqual([])

    const { result } = renderHook(() => useResourceList(things, { params: { q: 'poll' }, refetchInterval: 1000 }), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.getQueryCache().find({ queryKey: ['things', { q: 'poll' }] })?.observers[0].options.refetchInterval).toBe(1000)
  })

  test('find stays idle until there is an id', () => {
    const { result } = renderHook(() => useResourceFind(things, 0), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
    expect(requests).toEqual([])
  })

  test('create refetches the resource and the models it shows up in', async () => {
    const invalidate = jest.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useResourceCreate(things, ['others', ['nested', 3]]), { wrapper })
    await act(async () => { await result.current.mutateAsync({ title: 'B' }) })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['things'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['others'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['nested', 3] })
  })

  test('update takes the id with the fields and keeps the id out of the body', async () => {
    const { result } = renderHook(() => useResourceUpdate(things), { wrapper })
    await act(async () => { await result.current.mutateAsync({ id: 3, title: 'D' }) })
    expect(requests[0]).toMatchObject({ method: 'patch', url: '/api/v1/things/3', body: { thing: { title: 'D' } } })
  })

  test('delete removes by id and refetches', async () => {
    const invalidate = jest.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useResourceDelete(things, ['tasks']), { wrapper })
    await act(async () => { await result.current.mutateAsync(3) })
    expect(requests[0]).toMatchObject({ method: 'delete', url: '/api/v1/things/3' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['things'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['tasks'] })
  })

  test('a failed call refetches nothing', async () => {
    const failing: AxiosAdapter = (config) => Promise.reject(Object.assign(new Error('failed'), { config, isAxiosError: true, response: { status: 500, data: {}, config, headers: {}, statusText: '' } }))
    api.defaults.adapter = failing
    const invalidate = jest.spyOn(client, 'invalidateQueries')
    const { result } = renderHook(() => useResourceCreate(things), { wrapper })
    await act(async () => { await result.current.mutateAsync({ title: 'B' }).catch(() => undefined) })
    expect(invalidate).not.toHaveBeenCalled()
  })
})
