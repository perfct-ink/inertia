import { renderHook } from '@testing-library/react'
import { useOpenInWorkspace, useSwitchWorkspace } from './useSwitchWorkspace'
import { useProjectStore } from '@/store/projects'
import { useTabsStore } from '@/store/tabs'
import { useWorkspaceStore } from '@/store/workspaces'

const mockNavigate = jest.fn()
const mockClear = jest.fn()
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ clear: mockClear }) }))

const studio = { id: 5, name: 'Studio', personal: false, role: 'member' as const }
const mine = { id: 1, name: 'My Space', personal: true, role: 'owner' as const }

beforeEach(() => {
  jest.clearAllMocks()
  useWorkspaceStore.getState().setActive(null)
  useProjectStore.getState().setActive(3)
})

test('opening something in a Space makes it the open one, drops the old Space\'s state and goes there', () => {
  renderHook(() => useOpenInWorkspace()).result.current(studio, { pathname: '/handbook/onboarding', hash: '#intro' }, { replace: true, state: { a: 1 } })

  expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(5)
  expect(useProjectStore.getState().activeProjectId).toBeNull()
  expect(useTabsStore.getState().tabs).toEqual([])
  expect(mockClear).toHaveBeenCalledTimes(1)
  expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/handbook/onboarding', hash: '#intro' }, { replace: true, state: { a: 1 } })
})

test('the personal Space is stored as the server default', () => {
  useWorkspaceStore.getState().setActive(5)
  renderHook(() => useOpenInWorkspace()).result.current(mine, '/space')
  expect(useWorkspaceStore.getState().activeWorkspaceId).toBeNull()
})

test('switching Spaces returns to the Space home, and takes only the Space (it is passed to onSuccess)', () => {
  const switchWorkspace = renderHook(() => useSwitchWorkspace()).result.current
  // react-query calls onSuccess(data, variables, context): extra arguments must not change the destination.
  ;(switchWorkspace as (...args: unknown[]) => void)(studio, 'ignored', { ignored: true })

  expect(useWorkspaceStore.getState().activeWorkspaceId).toBe(5)
  expect(mockNavigate).toHaveBeenCalledWith('/space', undefined)
})
