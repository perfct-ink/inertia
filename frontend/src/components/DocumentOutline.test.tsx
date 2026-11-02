import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Editor } from '@tiptap/react'
import DocumentOutline from './DocumentOutline'

type Listener = () => void

function fakeEditor(headings: { level: number; text: string; pos: number }[], from: number) {
  const listeners: Record<string, Listener[]> = {}
  const run = jest.fn()
  const scrollIntoView = jest.fn()
  const dom = document.createElement('h2')
  dom.scrollIntoView = scrollIntoView
  const editor = {
    state: {
      selection: { from },
      doc: { descendants: (cb: (node: unknown, pos: number) => void) => headings.forEach((h) => cb({ type: { name: 'heading' }, attrs: { level: h.level }, textContent: h.text }, h.pos)) },
    },
    on: (event: string, fn: Listener) => { (listeners[event] ??= []).push(fn) },
    off: jest.fn(),
    chain: () => ({ focus: () => ({ setTextSelection: (pos: number) => ({ run: () => run(pos) }) }) }),
    view: { nodeDOM: () => dom },
  } as unknown as Editor
  return { editor, run, scrollIntoView }
}

const headings = [{ level: 1, text: 'Title', pos: 0 }, { level: 2, text: 'Goals', pos: 20 }, { level: 3, text: 'Scope', pos: 60 }]

test('lists the headings, marks the one under the cursor, and jumps on click', () => {
  const { editor, run, scrollIntoView } = fakeEditor(headings, 30)
  render(<DocumentOutline editor={editor} />)
  expect(screen.getByRole('button', { name: 'Goals' })).toHaveAttribute('aria-current', 'location')
  expect(screen.getByRole('button', { name: 'Scope' })).not.toHaveAttribute('aria-current')
  fireEvent.click(screen.getByRole('button', { name: 'Scope' }))
  expect(run).toHaveBeenCalledWith(61)
  expect(scrollIntoView).toHaveBeenCalled()
})

test('a document with only its title has no outline', () => {
  const { editor } = fakeEditor([headings[0]], 0)
  const { container } = render(<DocumentOutline editor={editor} />)
  expect(container).toBeEmptyDOMElement()
})
