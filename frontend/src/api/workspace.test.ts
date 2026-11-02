import type { AxiosAdapter, AxiosError, InternalAxiosRequestConfig } from 'axios'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useNotificationStore } from '@/store/notifications'
import { useWorkspaceStore } from '@/store/workspaces'
import { activeWorkspaceApi } from './workspace'

const originalAdapter = api.defaults.adapter

function reply(status: number, data: unknown = {}): AxiosAdapter {
  return (config: InternalAxiosRequestConfig) => {
    const response = { status, data, config, headers: {}, statusText: '' }
    if (status < 400) return Promise.resolve(response)
    return Promise.reject({ isAxiosError: true, config, message: 'failed', response } as unknown as AxiosError)
  }
}

beforeEach(() => {
  useWorkspaceStore.setState({ activeWorkspaceId: null })
  useNotificationStore.setState({ notifications: [] })
  useAuthStore.setState({ token: 'abc', user: { id: 1, name: 'A', email: 'a@b.c' } })
})

afterEach(() => {
  api.defaults.adapter = originalAdapter
})

const messages = () => useNotificationStore.getState().notifications.map((n) => n.message)

test('a failed workspace request shows an error even though the first attempt is silent', async () => {
  api.defaults.adapter = reply(500, { error: 'Something broke' })
  await expect(activeWorkspaceApi.find()).rejects.toBeDefined()
  expect(messages()).toEqual(['Something broke'])
})

test('a lost workspace falls back to the personal one without an error', async () => {
  useWorkspaceStore.getState().setActive(7)
  let calls = 0
  api.defaults.adapter = (config) => {
    calls += 1
    return calls === 1 ? reply(404)(config) : reply(200, { id: 1, name: 'Personal' })(config)
  }
  await expect(activeWorkspaceApi.find()).resolves.toEqual({ id: 1, name: 'Personal' })
  expect(useWorkspaceStore.getState().activeWorkspaceId).toBeNull()
  expect(messages()).toEqual([])
})

test('a 401 signs the user out and leaves the notice to the login redirect', async () => {
  api.defaults.adapter = reply(401)
  await expect(activeWorkspaceApi.find()).rejects.toBeDefined()
  expect(useAuthStore.getState().token).toBeNull()
  expect(messages()).toEqual([])
})
