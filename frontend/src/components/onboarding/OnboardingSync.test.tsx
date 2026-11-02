import { act, render } from '@testing-library/react'
import OnboardingSync from './OnboardingSync'
import { useAuthStore } from '@/store/auth'
import { useOnboardingStore } from '@/store/onboarding'

const mockFetch = jest.fn()
const mockSave = jest.fn()
jest.mock('@/api/onboarding', () => ({ fetchOnboarding: () => mockFetch(), saveOnboarding: (p: unknown) => mockSave(p) }))

beforeEach(() => {
  jest.useFakeTimers()
  mockSave.mockResolvedValue(null)
  useAuthStore.setState({ token: 't', user: { id: 7, name: 'Ada', email: 'a@x.co' } })
  useOnboardingStore.setState({ users: {} })
})
afterEach(() => { jest.useRealTimers(); jest.clearAllMocks() })

test("the server's copy is merged into this device on sign-in", async () => {
  mockFetch.mockResolvedValue({ dismissed: true, done: ['space'] })
  useOnboardingStore.getState().start(7)
  useOnboardingStore.getState().record(7, ['tasks'])
  render(<OnboardingSync />)
  await act(async () => { await Promise.resolve() })
  expect(useOnboardingStore.getState().users[7]).toEqual({ dismissed: true, done: ['space', 'tasks'] })
})

test('a change on this device is saved after a short pause', async () => {
  mockFetch.mockResolvedValue({ dismissed: false, done: [] })
  useOnboardingStore.getState().start(7)
  render(<OnboardingSync />)
  await act(async () => { await Promise.resolve() })
  act(() => { useOnboardingStore.getState().record(7, ['document']) })
  expect(mockSave).not.toHaveBeenCalled()
  await act(async () => { jest.advanceTimersByTime(600) })
  expect(mockSave).toHaveBeenCalledWith({ dismissed: false, done: ['document'] })
})

test('local progress that was never saved is pushed up once the server has none', async () => {
  mockFetch.mockResolvedValue(null)
  useOnboardingStore.getState().start(7)
  render(<OnboardingSync />)
  await act(async () => { await Promise.resolve() })
  await act(async () => { jest.advanceTimersByTime(600) })
  expect(mockSave).toHaveBeenCalledWith({ dismissed: false, done: [] })
})

test('nothing is fetched or saved when signed out', async () => {
  useAuthStore.setState({ token: null, user: null })
  render(<OnboardingSync />)
  await act(async () => { jest.advanceTimersByTime(600) })
  expect(mockFetch).not.toHaveBeenCalled()
  expect(mockSave).not.toHaveBeenCalled()
})
