import { act, renderHook } from '@testing-library/react'
import type { Editor } from '@tiptap/react'
import { useDocumentCustomStyles } from './useDocumentCustomStyles'

let mockOwn: unknown[] = []
let mockLooked: unknown[] = []
const mockLookup = jest.fn()
jest.mock('@/api/paragraphStyles', () => ({
  useParagraphStyles: () => ({ data: mockOwn }),
  useDocumentParagraphStyles: (...args: unknown[]) => { mockLookup(...args); return { data: mockLooked } },
}))

const style = (id: number, name: string) => ({ id, name, base: 'body', properties: {} })
const paragraph = (key: string) => ({ type: 'paragraph', attrs: { style: key } })

function fakeEditor(content: () => unknown) {
  const handlers = new Map<string, () => void>()
  const setCustomStyles = jest.fn()
  const editor = {
    getJSON: content,
    on: (event: string, handler: () => void) => { handlers.set(event, handler) },
    off: (event: string) => { handlers.delete(event) },
    commands: { setCustomStyles },
  } as unknown as Editor
  return { editor, setCustomStyles, fire: (event: string) => handlers.get(event)?.(), handlers }
}

beforeEach(() => {
  jest.useFakeTimers()
  mockOwn = []
  mockLooked = []
})
afterEach(() => { jest.useRealTimers(); jest.clearAllMocks() })

test('asks for the custom styles the document refers to, telling it which the person already has', () => {
  mockOwn = [style(3, 'Mine')]
  const { editor } = fakeEditor(() => ({ type: 'doc', content: [paragraph('custom-9'), paragraph('quote'), paragraph('custom-3')] }))
  renderHook(() => useDocumentCustomStyles(editor, 12))
  expect(mockLookup).toHaveBeenLastCalledWith(12, [3, 9], [3])
})

test('gives the editor the person\'s own styles and the looked-up ones together', () => {
  mockOwn = [style(3, 'Mine')]
  mockLooked = [style(9, 'Theirs'), style(3, 'Old copy')]
  const { editor, setCustomStyles } = fakeEditor(() => ({ type: 'doc', content: [] }))
  const { result } = renderHook(() => useDocumentCustomStyles(editor, 12))
  expect(setCustomStyles).toHaveBeenLastCalledWith([style(3, 'Mine'), style(9, 'Theirs')])
  expect(result.current.map((s) => s.name)).toEqual(['Mine', 'Theirs'])
})

test('reads the document again after it changes, once typing pauses', () => {
  let doc: unknown = { type: 'doc', content: [paragraph('custom-3')] }
  const { editor, fire } = fakeEditor(() => doc)
  renderHook(() => useDocumentCustomStyles(editor, 12))
  expect(mockLookup).toHaveBeenLastCalledWith(12, [3], [])

  doc = { type: 'doc', content: [paragraph('custom-3'), paragraph('custom-5')] }
  act(() => { fire('update'); fire('update') })
  expect(mockLookup).toHaveBeenLastCalledWith(12, [3], [])
  act(() => { jest.advanceTimersByTime(300) })
  expect(mockLookup).toHaveBeenLastCalledWith(12, [3, 5], [])
})

test('stops listening when it goes away', () => {
  const { editor, handlers } = fakeEditor(() => ({ type: 'doc', content: [] }))
  const { unmount } = renderHook(() => useDocumentCustomStyles(editor, 12))
  expect(handlers.has('update')).toBe(true)
  unmount()
  expect(handlers.has('update')).toBe(false)
})

test('does nothing before the editor exists', () => {
  const { result } = renderHook(() => useDocumentCustomStyles(null, 12))
  expect(result.current).toEqual([])
})
