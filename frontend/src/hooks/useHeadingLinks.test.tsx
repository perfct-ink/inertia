import '@testing-library/jest-dom'
import { act, fireEvent, render, renderHook } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { Editor } from '@tiptap/core'
import { useNotificationStore } from '@/store/notifications'
import { MISSING_HEADING_MESSAGE, useFollowDocumentLinks, useScrollToHeading } from './useHeadingLinks'

interface FakeHeading { id?: string; text: string }

// Just enough of a Tiptap editor for the hook: headings in a document, their DOM
// nodes, and the "update" event a collaborative document fires as it fills in.
function fakeEditor(initial: FakeHeading[] = []) {
  const headings = [...initial]
  const elements: HTMLElement[] = []
  const listeners = new Set<() => void>()
  const editor = {
    state: {
      doc: {
        descendants: (visit: (node: unknown, pos: number) => boolean | void) => {
          headings.forEach((h, i) => visit(
            { type: { name: 'heading' }, attrs: { id: h.id ?? null, level: 2 }, textContent: h.text },
            i * 10,
          ))
        },
      },
    },
    view: {
      nodeDOM: (pos: number) => {
        if (!elements[pos / 10]) {
          elements[pos / 10] = document.createElement('h2')
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
    arrive: (heading: FakeHeading) => { headings.push(heading); listeners.forEach((fn) => fn()) },
  }
}

const wrapper = (hash: string) => function Wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={[`/documents/1${hash}`]}>{children}</MemoryRouter>
}

beforeEach(() => {
  jest.useFakeTimers()
  Element.prototype.scrollIntoView = jest.fn()
  useNotificationStore.setState({ notifications: [] })
})
afterEach(() => {
  jest.useRealTimers()
  document.body.innerHTML = ''
})

describe('useScrollToHeading', () => {
  test('scrolls to a heading by its stored id, highlights it, then lets go', () => {
    const { editor, elements } = fakeEditor([{ text: 'Title' }, { id: 'scope-1', text: 'Renamed since' }])
    renderHook(() => useScrollToHeading(editor, true), { wrapper: wrapper('#scope-1') })
    expect(elements[1].scrollIntoView).toHaveBeenCalled()
    expect(elements[1]).toHaveClass('document-heading--target')
    act(() => { jest.advanceTimersByTime(2000) })
    expect(elements[1]).not.toHaveClass('document-heading--target')
  })

  test('finds a heading that has no id yet by the slug of its text', () => {
    const { editor, elements } = fakeEditor([{ text: 'Title' }, { text: 'Launch plan' }])
    renderHook(() => useScrollToHeading(editor, true), { wrapper: wrapper('#launch-plan') })
    expect(elements[1].scrollIntoView).toHaveBeenCalled()
  })

  test('waits for a collaborative document to fill in, then scrolls once', () => {
    const { editor, elements, arrive, listenerCount } = fakeEditor([{ text: 'Title' }])
    renderHook(() => useScrollToHeading(editor, true), { wrapper: wrapper('#risks') })
    expect(listenerCount()).toBe(1)
    arrive({ text: 'Risks' })
    expect(elements[1].scrollIntoView).toHaveBeenCalledTimes(1)
    expect(listenerCount()).toBe(0)
    expect(useNotificationStore.getState().notifications).toEqual([])
  })

  test('tells the user when the heading never turns up', () => {
    const { editor, listenerCount } = fakeEditor([{ text: 'Title' }])
    renderHook(() => useScrollToHeading(editor, true), { wrapper: wrapper('#deleted') })
    act(() => { jest.advanceTimersByTime(6000) })
    expect(useNotificationStore.getState().notifications.map((n) => n.message)).toEqual([MISSING_HEADING_MESSAGE])
    expect(listenerCount()).toBe(0)
  })

  test('does nothing without a heading in the address, or before the editor is ready', () => {
    const { editor, elements } = fakeEditor([{ text: 'Title' }, { text: 'Scope' }])
    renderHook(() => useScrollToHeading(editor, true), { wrapper: wrapper('') })
    renderHook(() => useScrollToHeading(editor, false), { wrapper: wrapper('#scope') })
    renderHook(() => useScrollToHeading(null, true), { wrapper: wrapper('#scope') })
    expect(elements).toHaveLength(0)
    act(() => { jest.advanceTimersByTime(10000) })
    expect(useNotificationStore.getState().notifications).toEqual([])
  })
})

describe('useFollowDocumentLinks', () => {
  function Harness() {
    const follow = useFollowDocumentLinks()
    const { pathname, hash } = useLocation()
    return (
      <div onClick={(e) => follow(e)}>
        <a href="/documents/7#intro">heading link</a>
        <a href="/documents/8">document link</a>
        <a href="#/tasks">other link</a>
        <output>{pathname + hash}</output>
      </div>
    )
  }
  const open = () => render(<MemoryRouter initialEntries={['/documents/1']}><Harness /></MemoryRouter>)

  // Clicks an element and reports whether the app took over the click (called
  // preventDefault). A listener on the document then cancels the browser's own
  // navigation, which jsdom cannot do.
  function click(element: Element, init: MouseEventInit = {}): boolean {
    let handled = false
    const settle = (e: Event) => { handled = e.defaultPrevented; e.preventDefault() }
    document.addEventListener('click', settle)
    fireEvent.click(element, init)
    document.removeEventListener('click', settle)
    return handled
  }

  test('opens a heading link inside the app', () => {
    const view = open()
    expect(click(view.getByText('heading link'))).toBe(true)
    expect(view.container.querySelector('output')).toHaveTextContent('/documents/7#intro')
  })

  test('opens a plain document link inside the app', () => {
    const view = open()
    expect(click(view.getByText('document link'))).toBe(true)
    expect(view.container.querySelector('output')).toHaveTextContent('/documents/8')
  })

  test('leaves other links and modified clicks to the browser', () => {
    const view = open()
    expect(click(view.getByText('other link'))).toBe(false)
    expect(click(view.getByText('heading link'), { metaKey: true })).toBe(false)
    expect(click(view.getByText('heading link'), { ctrlKey: true })).toBe(false)
    expect(view.container.querySelector('output')).toHaveTextContent('/documents/1')
  })
})
