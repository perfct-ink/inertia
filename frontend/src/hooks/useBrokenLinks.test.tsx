import { act, renderHook } from '@testing-library/react'
import type { MouseEvent } from 'react'
import type { Editor } from '@tiptap/core'
import { useNotificationStore } from '@/store/notifications'
import { LINK_CHANGED_MESSAGE, relinkBrokenLink, removeBrokenLink, useBrokenLinks, type BrokenLink } from './useBrokenLinks'

const mockUseTargets = jest.fn()
const mockSetBrokenLinks = jest.fn()
const mockLinkRangeAt = jest.fn()
const mockRelinkTo = jest.fn()
const mockRemoveLinkAt = jest.fn()
jest.mock('@/api/documents', () => ({ useDocumentLinkTargets: (ids: number[]) => mockUseTargets(ids) }))
jest.mock('@/extensions/BrokenLinks', () => ({
  setBrokenLinks: (...args: unknown[]) => mockSetBrokenLinks(...args),
  linkRangeAt: (...args: unknown[]) => mockLinkRangeAt(...args),
  relinkTo: (...args: unknown[]) => mockRelinkTo(...args),
  removeLinkAt: (...args: unknown[]) => mockRemoveLinkAt(...args),
}))

const GOALS = '/documents/2#goals'
const GONE_DOC = '/documents/3'
const GONE_HEADING = '/documents/1#gone'
const FINE_HEADING = '/documents/1#intro'

const text = (value: string, href?: string) => ({
  type: 'text', text: value, ...(href ? { marks: [{ type: 'link', attrs: { href } }] } : {}),
})
const heading = (value: string, attrs: Record<string, unknown> = {}) => ({
  type: 'heading', attrs: { level: 2, id: null, ...attrs }, content: [text(value)],
})
const content = (...hrefs: string[]) => ({
  type: 'doc',
  content: [heading('Title', { level: 1 }), heading('Intro', { id: 'intro' }), { type: 'paragraph', content: hrefs.map((href) => text(href, href)) }],
})

// Just enough of a Tiptap editor for the hook: its JSON, the "update" event, the
// DOM the links render into and the caret.
function fakeEditor(initial: Record<string, unknown>) {
  let json = initial
  const listeners = new Set<() => void>()
  const dom = document.createElement('div')
  document.body.appendChild(dom)
  const editor = {
    getJSON: () => json,
    on: (_event: string, fn: () => void) => listeners.add(fn),
    off: (_event: string, fn: () => void) => listeners.delete(fn),
    view: { dom, posAtDOM: () => 12 },
    isActive: jest.fn(() => false),
    getAttributes: jest.fn(() => ({})),
    state: { selection: { from: 14 } },
  }
  return {
    editor: editor as unknown as Editor,
    fake: editor,
    dom,
    edit: (next: Record<string, unknown>) => { json = next; listeners.forEach((fn) => fn()) },
    listenerCount: () => listeners.size,
  }
}

const anchorIn = (parent: HTMLElement, href: string) => {
  const a = document.createElement('a')
  a.setAttribute('href', href)
  a.textContent = 'link text'
  parent.appendChild(a)
  return a
}
const click = (target: Element, button = 0) => ({ button, target }) as unknown as MouseEvent

// What the server says: document 2 exists with a "goals" heading; 3 was checked and is gone.
const ANSWER = { asked: [2, 3], found: [{ id: 2, doc_type: 'document', headings: [{ id: 'goals', text: 'Goals', level: 2 }] }] }
const RANGE = { from: 12, to: 21, text: 'link text' }

beforeEach(() => {
  jest.useFakeTimers()
  mockUseTargets.mockReset().mockReturnValue({ data: ANSWER })
  mockSetBrokenLinks.mockReset()
  mockLinkRangeAt.mockReset()
  mockRelinkTo.mockReset()
  mockRemoveLinkAt.mockReset()
  useNotificationStore.setState({ notifications: [] })
})
afterEach(() => {
  jest.useRealTimers()
  document.body.innerHTML = ''
})

describe('useBrokenLinks', () => {
  test('marks a deleted document and a deleted heading and leaves working links alone', () => {
    const { editor } = fakeEditor(content(GOALS, GONE_DOC, GONE_HEADING, FINE_HEADING))
    const { result } = renderHook(() => useBrokenLinks(editor, 1, true))
    expect(Object.fromEntries(result.current.broken)).toEqual({ [GONE_DOC]: 'document', [GONE_HEADING]: 'heading' })
    expect(mockSetBrokenLinks).toHaveBeenLastCalledWith(editor, new Set([GONE_DOC, GONE_HEADING]))
  })

  test('asks about all the linked documents at once, not once per link', () => {
    const { editor } = fakeEditor(content(GOALS, '/documents/2#other', GONE_DOC, FINE_HEADING, GONE_HEADING))
    renderHook(() => useBrokenLinks(editor, 1, true))
    expect(mockUseTargets).toHaveBeenLastCalledWith([2, 3])
  })

  test('waits until the document has arrived', () => {
    const { editor } = fakeEditor(content(GONE_DOC, GONE_HEADING))
    const { result } = renderHook(() => useBrokenLinks(editor, 1, false))
    expect(mockUseTargets).toHaveBeenLastCalledWith([])
    expect(result.current.broken.size).toBe(0)
  })

  test('a document that has not been checked yet is not called broken', () => {
    mockUseTargets.mockReturnValue({ data: undefined })
    const { editor } = fakeEditor(content(GONE_DOC, GONE_HEADING))
    const { result } = renderHook(() => useBrokenLinks(editor, 1, true))
    expect([...result.current.broken.keys()]).toEqual([GONE_HEADING])
  })

  test('looks again, once, after the document has been still for a moment', () => {
    const { editor, edit } = fakeEditor(content(GOALS))
    const { result } = renderHook(() => useBrokenLinks(editor, 1, true))
    expect(mockUseTargets).toHaveBeenLastCalledWith([2])
    act(() => {
      edit(content(GOALS, '/documents/4'))
      edit(content(GOALS, '/documents/4', '/documents/5'))
    })
    expect(mockUseTargets).toHaveBeenLastCalledWith([2])
    act(() => { jest.advanceTimersByTime(300) })
    expect(mockUseTargets).toHaveBeenLastCalledWith([2, 4, 5])
    expect(result.current.broken.size).toBe(0)
  })

  test('stops listening when the editor goes away', () => {
    const { editor, edit, listenerCount } = fakeEditor(content(GOALS))
    const { unmount } = renderHook(() => useBrokenLinks(editor, 1, true))
    expect(listenerCount()).toBe(1)
    unmount()
    expect(listenerCount()).toBe(0)
    edit(content(GOALS, '/documents/4'))
    act(() => { jest.advanceTimersByTime(300) })
    expect(mockUseTargets).not.toHaveBeenCalledWith([2, 4])
  })

  describe('fromClick', () => {
    test('finds the broken link a click landed on', () => {
      const { editor, dom } = fakeEditor(content(GONE_DOC))
      mockLinkRangeAt.mockReturnValue(RANGE)
      const { result } = renderHook(() => useBrokenLinks(editor, 1, true))
      expect(result.current.fromClick(click(anchorIn(dom, GONE_DOC)))).toEqual({ ...RANGE, href: GONE_DOC, reason: 'document' })
      expect(mockLinkRangeAt).toHaveBeenCalledWith(editor, 12, GONE_DOC)
    })

    test('ignores a link that works, other buttons and links outside the editor', () => {
      const { editor, dom } = fakeEditor(content(GONE_DOC, GOALS))
      mockLinkRangeAt.mockReturnValue(RANGE)
      const { result } = renderHook(() => useBrokenLinks(editor, 1, true))
      expect(result.current.fromClick(click(anchorIn(dom, GOALS)))).toBeNull()
      expect(result.current.fromClick(click(anchorIn(dom, GONE_DOC), 2))).toBeNull()
      expect(result.current.fromClick(click(anchorIn(document.body, GONE_DOC)))).toBeNull()
    })

    test('ignores a link that is no longer in the document', () => {
      const { editor, dom } = fakeEditor(content(GONE_DOC))
      mockLinkRangeAt.mockReturnValue(null)
      const { result } = renderHook(() => useBrokenLinks(editor, 1, true))
      expect(result.current.fromClick(click(anchorIn(dom, GONE_DOC)))).toBeNull()
    })
  })

  describe('atCaret', () => {
    test('finds the broken link the caret is in, for the keyboard', () => {
      const { editor, fake } = fakeEditor(content(GONE_HEADING))
      fake.isActive.mockReturnValue(true)
      fake.getAttributes.mockReturnValue({ href: GONE_HEADING })
      mockLinkRangeAt.mockReturnValue(RANGE)
      const { result } = renderHook(() => useBrokenLinks(editor, 1, true))
      expect(result.current.atCaret()).toEqual({ ...RANGE, href: GONE_HEADING, reason: 'heading' })
      expect(mockLinkRangeAt).toHaveBeenCalledWith(editor, 14, GONE_HEADING)
    })

    test('is null outside a link and in a link that works', () => {
      const { editor, fake } = fakeEditor(content(GONE_HEADING, FINE_HEADING))
      mockLinkRangeAt.mockReturnValue(RANGE)
      const { result } = renderHook(() => useBrokenLinks(editor, 1, true))
      expect(result.current.atCaret()).toBeNull()
      fake.isActive.mockReturnValue(true)
      fake.getAttributes.mockReturnValue({ href: FINE_HEADING })
      expect(result.current.atCaret()).toBeNull()
    })
  })
})

describe('fixing a broken link', () => {
  const link: BrokenLink = { ...RANGE, href: GONE_DOC, reason: 'document' }
  const editor = {} as Editor

  test('"Remove link" drops the link where it still is', () => {
    mockLinkRangeAt.mockReturnValue(RANGE)
    removeBrokenLink(editor, link)
    expect(mockRemoveLinkAt).toHaveBeenCalledWith(editor, RANGE)
  })

  test('"Pick a new target" relinks the text to the heading picked', () => {
    mockLinkRangeAt.mockReturnValue(RANGE)
    const picked = { documentId: 9, anchor: 'goals', text: 'Goals' }
    relinkBrokenLink(editor, link, picked)
    expect(mockRelinkTo).toHaveBeenCalledWith(editor, RANGE, picked)
  })

  test('touches nothing and says so when the link changed meanwhile', () => {
    mockLinkRangeAt.mockReturnValue(null)
    removeBrokenLink(editor, link)
    relinkBrokenLink(editor, link, { documentId: 9, anchor: 'goals', text: 'Goals' })
    expect(mockRemoveLinkAt).not.toHaveBeenCalled()
    expect(mockRelinkTo).not.toHaveBeenCalled()
    expect(useNotificationStore.getState().notifications.map((n) => n.message)).toEqual([LINK_CHANGED_MESSAGE])
  })
})
