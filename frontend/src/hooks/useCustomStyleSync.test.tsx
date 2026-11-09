import { act, renderHook } from '@testing-library/react'
import type { Editor } from '@tiptap/react'
import { useAuthStore } from '@/store/auth'
import { useCustomStyleSync } from './useCustomStyleSync'

let mockStyles: unknown[] | undefined
const mockFetch = jest.fn()
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ marker: 'client' }) }))
jest.mock('@/api/paragraphStyles', () => ({
  useParagraphStyles: () => ({ data: mockStyles }),
  fetchParagraphStyles: (...args: unknown[]) => mockFetch(...args),
}))
const mockRefreshes = jest.fn()
const mockRefresh = jest.fn()
jest.mock('@/util/customParagraphStyleCommand', () => ({
  styleRefreshes: (...args: unknown[]) => mockRefreshes(...args),
  refreshCustomParagraphStyles: (...args: unknown[]) => mockRefresh(...args),
}))

const cached = [{ id: 7, name: 'Callout', base: 'quote', properties: {} }]
const fresh = [{ id: 7, name: 'Callout', base: 'quote', properties: { size: 20 } }]

// Just enough of an editor: the "update" event a collaborative document fires as it changes.
function fakeEditor(overrides: Record<string, unknown> = {}) {
  const listeners = new Set<() => void>()
  const editor = {
    isEditable: true,
    isDestroyed: false,
    state: { doc: { marker: 'doc' } },
    on: (event: string, fn: () => void) => { if (event === 'update') listeners.add(fn) },
    off: (event: string, fn: () => void) => { if (event === 'update') listeners.delete(fn) },
    ...overrides,
  }
  return { editor: editor as unknown as Editor, update: () => listeners.forEach((fn) => fn()), listeners }
}

// Lets the hook's awaited fetch finish (a few microtask turns; timers are fake).
const settle = () => act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve() })

beforeEach(() => {
  jest.useFakeTimers()
  mockStyles = cached
  mockFetch.mockResolvedValue(fresh)
  mockRefreshes.mockReturnValue([])
  useAuthStore.setState({ token: 't', user: { id: 3, name: 'Pat', email: 'pat@example.com' } })
})
afterEach(() => {
  jest.useRealTimers()
  jest.clearAllMocks()
})

test('when the cached list says a paragraph is out of date it fetches the list fresh and refreshes from that', async () => {
  mockRefreshes.mockReturnValue([{ pos: 1, attrs: {} }])
  const { editor } = fakeEditor()
  renderHook(() => useCustomStyleSync(editor))
  await settle()
  expect(mockRefreshes).toHaveBeenCalledWith(editor.state.doc, cached, 3)
  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(mockRefresh).toHaveBeenCalledWith(editor, fresh, 3)
})

test('a document that is up to date costs no request', async () => {
  const { editor } = fakeEditor()
  renderHook(() => useCustomStyleSync(editor))
  await settle()
  expect(mockFetch).not.toHaveBeenCalled()
  expect(mockRefresh).not.toHaveBeenCalled()
})

describe('nothing is rewritten', () => {
  beforeEach(() => mockRefreshes.mockReturnValue([{ pos: 1, attrs: {} }]))

  test('before the list has loaded', async () => {
    mockStyles = undefined
    const { editor, listeners } = fakeEditor()
    renderHook(() => useCustomStyleSync(editor))
    await settle()
    expect(listeners.size).toBe(0)
    expect(mockFetch).not.toHaveBeenCalled()
    expect(mockRefresh).not.toHaveBeenCalled()
  })

  test('when signed out', async () => {
    useAuthStore.setState({ token: null, user: null })
    const { editor, listeners } = fakeEditor()
    renderHook(() => useCustomStyleSync(editor))
    await settle()
    expect(listeners.size).toBe(0)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  test('in a document that cannot be edited, or with no editor yet', async () => {
    const { editor } = fakeEditor({ isEditable: false })
    renderHook(() => useCustomStyleSync(editor))
    renderHook(() => useCustomStyleSync(null))
    await settle()
    expect(mockFetch).not.toHaveBeenCalled()
    expect(mockRefresh).not.toHaveBeenCalled()
  })
})

test('changes to the document are checked once things go quiet, not on every one', async () => {
  const { editor, update } = fakeEditor()
  renderHook(() => useCustomStyleSync(editor))
  mockRefreshes.mockClear()

  mockRefreshes.mockReturnValue([{ pos: 1, attrs: {} }])
  update()
  act(() => { jest.advanceTimersByTime(200) })
  update()
  act(() => { jest.advanceTimersByTime(200) })
  expect(mockRefreshes).not.toHaveBeenCalled()

  act(() => { jest.advanceTimersByTime(400) })
  await settle()
  expect(mockRefreshes).toHaveBeenCalledTimes(1)
  expect(mockRefresh).toHaveBeenCalledWith(editor, fresh, 3)
})

test('if the fresh list cannot be fetched the document is left as it is', async () => {
  mockRefreshes.mockReturnValue([{ pos: 1, attrs: {} }])
  mockFetch.mockRejectedValue(new Error('offline'))
  const { editor } = fakeEditor()
  renderHook(() => useCustomStyleSync(editor))
  await settle()
  expect(mockFetch).toHaveBeenCalledTimes(1)
  expect(mockRefresh).not.toHaveBeenCalled()
})

test('leaving the document stops listening and drops a pending check', async () => {
  const { editor, update, listeners } = fakeEditor()
  const { unmount } = renderHook(() => useCustomStyleSync(editor))
  expect(listeners.size).toBe(1)
  mockRefreshes.mockClear()
  mockRefreshes.mockReturnValue([{ pos: 1, attrs: {} }])
  update()
  unmount()
  expect(listeners.size).toBe(0)
  act(() => { jest.advanceTimersByTime(1000) })
  await settle()
  expect(mockRefreshes).not.toHaveBeenCalled()
  expect(mockRefresh).not.toHaveBeenCalled()
})

test('a document torn down while the list is being fetched is not touched', async () => {
  mockRefreshes.mockReturnValue([{ pos: 1, attrs: {} }])
  const state = fakeEditor()
  mockFetch.mockImplementation(async () => { (state.editor as unknown as { isDestroyed: boolean }).isDestroyed = true; return fresh })
  renderHook(() => useCustomStyleSync(state.editor))
  await settle()
  expect(mockRefresh).not.toHaveBeenCalled()
})
