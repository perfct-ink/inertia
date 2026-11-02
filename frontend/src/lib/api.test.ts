import type { AxiosAdapter, AxiosError, InternalAxiosRequestConfig } from 'axios'
import api from './api'
import { useAuthStore } from '@/store/auth'
import { useNotificationStore } from '@/store/notifications'
import { useWorkspaceStore } from '@/store/workspaces'

function failWith(status: number, data: unknown = {}): AxiosAdapter {
  return (config: InternalAxiosRequestConfig) => Promise.reject({
    isAxiosError: true, config, message: 'failed', response: { status, data, config, headers: {}, statusText: '' },
  } as unknown as AxiosError)
}

beforeEach(() => {
  useWorkspaceStore.setState({ activeWorkspaceId: null })
  useNotificationStore.setState({ notifications: [] })
  useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'A', email: 'a@b.c' } })
})

const messages = () => useNotificationStore.getState().notifications.map((n) => n.message)

test('a failed API call shows an error notice', async () => {
  await expect(api.get('/x', { adapter: failWith(422, { errors: ['Title is required'] }) })).rejects.toBeDefined()
  expect(messages()).toEqual(['Title is required'])
})

test('callers that show their own error can silence the notice', async () => {
  await expect(api.get('/x', { adapter: failWith(500), silent: true })).rejects.toBeDefined()
  expect(messages()).toEqual([])
})

test('a failed call names the action it interrupted', async () => {
  await expect(api.get('/x', { adapter: failWith(422, { errors: ['Parent can\'t be the task itself'] }), failureContext: 'Couldn\'t move "Ship"' })).rejects.toBeDefined()
  expect(messages()).toEqual(['Couldn\'t move "Ship": Parent can\'t be the task itself'])
})

test('server messages say Space, not workspace', async () => {
  await expect(api.get('/x', { adapter: failWith(422, { errors: ['Epic must belong to the same workspace'] }) })).rejects.toBeDefined()
  expect(messages()).toEqual(['Epic must belong to the same Space'])
})

test('a 401 signs the user out so they must reauthenticate', async () => {
  await expect(api.get('/x', { adapter: failWith(401) })).rejects.toBeDefined()
  expect(useAuthStore.getState().token).toBeNull()
  expect(messages()).toEqual(['Your session has expired. Please sign in again.'])
})

function captureHeaders(): { adapter: AxiosAdapter; seen: () => Record<string, unknown> } {
  let headers: Record<string, unknown> = {}
  const adapter: AxiosAdapter = (config: InternalAxiosRequestConfig) => {
    headers = config.headers.toJSON() as Record<string, unknown>
    return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config })
  }
  return { adapter, seen: () => headers }
}

test('requests name the active workspace', async () => {
  useWorkspaceStore.getState().setActive(7)
  const { adapter, seen } = captureHeaders()
  await api.get('/x', { adapter })
  expect(seen()['X-Workspace-Id']).toBe('7')
})

test('requests omit the header for the personal workspace', async () => {
  const { adapter, seen } = captureHeaders()
  await api.get('/x', { adapter })
  expect(seen()['X-Workspace-Id']).toBeUndefined()
})

test('signing out forgets the active workspace', () => {
  useWorkspaceStore.getState().setActive(7)
  useAuthStore.getState().logout()
  expect(useWorkspaceStore.getState().activeWorkspaceId).toBeNull()
})
