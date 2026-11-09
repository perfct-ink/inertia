import '@testing-library/jest-dom'
import { act, renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { Editor } from '@tiptap/core'
import { useNotificationStore } from '@/store/notifications'
import { MISSING_DATE_MESSAGE, useScrollToDate } from './useDateLinks'
import { MISSING_HEADING_MESSAGE, useScrollToHeading } from './useHeadingLinks'

// Headings are not under test here (see useHeadingLinks.test.tsx); this keeps the
// heading extension's own dependencies out of the way.
jest.mock('@/extensions/HeadingAnchor', () => ({ findHeadingPos: () => null }))

// Just enough of a Tiptap editor for the hooks: date chips and headings in a
// document, their DOM nodes, and the "update" event a collaborative document
// fires as it fills in.
function fakeEditor(nodes: { name: string; attrs: Record<string, unknown>; text?: string }[] = []) {
  const elements: HTMLElement[] = []
  const listeners = new Set<() => void>()
  const editor = {
    state: {
      doc: {
        descendants: (visit: (node: unknown, pos: number) => boolean | void) => {
          nodes.forEach((n, i) => visit({ type: { name: n.name }, attrs: n.attrs, textContent: n.text ?? '' }, i * 10))
        },
      },
    },
    view: {
      nodeDOM: (pos: number) => {
        if (!elements[pos / 10]) {
          elements[pos / 10] = document.createElement('span')
          document.body.appendChild(elements[pos / 10])
        }
        return elements[pos / 10]
      },
    },
    on: (_event: string, fn: () => void) => listeners.add(fn),
    off: (_event: string, fn: () => void) => listeners.delete(fn),
  }
  return {
    editor: editor as unknown as Editor,
    elements,
    listenerCount: () => listeners.size,
    arrive: (node: { name: string; attrs: Record<string, unknown> }) => { nodes.push(node); listeners.forEach((fn) => fn()) },
  }
}

const wrapper = (hash: string) => function Wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={[`/documents/1${hash}`]}>{children}</MemoryRouter>
}
const chip = (dateId: number) => ({ name: 'documentDate', attrs: { dateId } })

beforeEach(() => {
  jest.useFakeTimers()
  Element.prototype.scrollIntoView = jest.fn()
  useNotificationStore.setState({ notifications: [] })
})
afterEach(() => {
  jest.useRealTimers()
  document.body.innerHTML = ''
})

describe('useScrollToDate', () => {
  test('scrolls to the chip a calendar link names, highlights it, then lets go', () => {
    const { editor, elements } = fakeEditor([{ name: 'paragraph', attrs: {} }, chip(7), chip(34)])
    renderHook(() => useScrollToDate(editor, true), { wrapper: wrapper('#date%3D34') })
    expect(elements[2].scrollIntoView).toHaveBeenCalled()
    expect(elements[2]).toHaveClass('document-date--target')
    act(() => { jest.advanceTimersByTime(2000) })
    expect(elements[2]).not.toHaveClass('document-date--target')
  })

  test('waits for a collaborative document to fill in, then scrolls once', () => {
    const { editor, elements, arrive, listenerCount } = fakeEditor([{ name: 'paragraph', attrs: {} }])
    renderHook(() => useScrollToDate(editor, true), { wrapper: wrapper('#date%3D34') })
    expect(listenerCount()).toBe(1)
    arrive(chip(34))
    expect(elements[1].scrollIntoView).toHaveBeenCalledTimes(1)
    expect(listenerCount()).toBe(0)
    expect(useNotificationStore.getState().notifications).toEqual([])
  })

  test('tells the user when the chip never turns up, and leaves the page alone', () => {
    const { editor, elements, listenerCount } = fakeEditor([{ name: 'paragraph', attrs: {} }])
    renderHook(() => useScrollToDate(editor, true), { wrapper: wrapper('#date%3D34') })
    act(() => { jest.advanceTimersByTime(6000) })
    expect(useNotificationStore.getState().notifications.map((n) => n.message)).toEqual([MISSING_DATE_MESSAGE])
    expect(listenerCount()).toBe(0)
    expect(elements.filter(Boolean).every((el) => !(el.scrollIntoView as jest.Mock).mock.calls.length)).toBe(true)
  })

  test('ignores a heading anchor, no hash, an editor that is not ready, and no editor', () => {
    const { editor, elements } = fakeEditor([chip(34)])
    renderHook(() => useScrollToDate(editor, true), { wrapper: wrapper('#launch-plan') })
    renderHook(() => useScrollToDate(editor, true), { wrapper: wrapper('') })
    renderHook(() => useScrollToDate(editor, false), { wrapper: wrapper('#date%3D34') })
    renderHook(() => useScrollToDate(null, true), { wrapper: wrapper('#date%3D34') })
    expect(elements).toHaveLength(0)
    act(() => { jest.advanceTimersByTime(10000) })
    expect(useNotificationStore.getState().notifications).toEqual([])
  })
})

describe('a date anchor and the heading hook', () => {
  test('a date link is not looked for as a heading, so no "heading is gone" notice', () => {
    const { editor, listenerCount } = fakeEditor([chip(34)])
    renderHook(() => useScrollToHeading(editor, true), { wrapper: wrapper('#date%3D34') })
    expect(listenerCount()).toBe(0)
    act(() => { jest.advanceTimersByTime(10000) })
    expect(useNotificationStore.getState().notifications.map((n) => n.message)).not.toContain(MISSING_HEADING_MESSAGE)
  })
})
