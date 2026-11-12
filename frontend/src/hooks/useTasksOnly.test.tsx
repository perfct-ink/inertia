import { act, renderHook } from '@testing-library/react'
import { useAuthStore } from '@/store/auth'
import { tasksOnlyKey } from '@/data/feature'
import { useTasksOnly } from './useTasksOnly'

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ token: 't', user: { id: 5, name: 'Pat', email: 'p@x.co' } })
})

test('a document that is not a feature starts unfolded and is not remembered', () => {
  const { result } = renderHook(() => useTasksOnly(undefined))
  expect(result.current[0]).toBe(false)
  act(() => result.current[1]())
  expect(result.current[0]).toBe(true)
  // The auth store persists itself, so only the tasks-only keys are checked.
  expect(Object.keys(localStorage).filter((k) => k.startsWith('inertia-tasks-only:'))).toEqual([])
})

test('a feature remembers the choice for this person', () => {
  const first = renderHook(() => useTasksOnly(9))
  act(() => first.result.current[1]())
  expect(first.result.current[0]).toBe(true)
  expect(localStorage.getItem(tasksOnlyKey(5, 9))).toBe('1')
  first.unmount()

  const reopened = renderHook(() => useTasksOnly(9))
  expect(reopened.result.current[0]).toBe(true)
})

test('unfolding clears the remembered choice', () => {
  localStorage.setItem(tasksOnlyKey(5, 9), '1')
  const { result } = renderHook(() => useTasksOnly(9))
  expect(result.current[0]).toBe(true)
  act(() => result.current[1]())
  expect(result.current[0]).toBe(false)
  expect(localStorage.getItem(tasksOnlyKey(5, 9))).toBeNull()
})

test('another feature, or another person, starts unfolded', () => {
  localStorage.setItem(tasksOnlyKey(5, 9), '1')
  expect(renderHook(() => useTasksOnly(10)).result.current[0]).toBe(false)
  useAuthStore.setState({ user: { id: 6, name: 'Sam', email: 's@x.co' } })
  expect(renderHook(() => useTasksOnly(9)).result.current[0]).toBe(false)
})

test('picks up the stored choice once the feature is known', () => {
  localStorage.setItem(tasksOnlyKey(5, 9), '1')
  const { result, rerender } = renderHook(({ id }: { id?: number }) => useTasksOnly(id), { initialProps: {} as { id?: number } })
  expect(result.current[0]).toBe(false)
  rerender({ id: 9 })
  expect(result.current[0]).toBe(true)
})
