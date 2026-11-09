import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import type { Editor } from '@tiptap/react'
import DashedListButton from './DashedListButton'

function fakeEditor(activeIn: Record<string, unknown> | null) {
  const calls: string[] = []
  const chain: Record<string, (...args: unknown[]) => unknown> = {
    focus: () => { calls.push('focus'); return chain },
    toggleDashedList: () => { calls.push('toggleDashedList'); return chain },
    run: () => true,
  }
  const editor = {
    chain: () => chain,
    // Active only for the list style the cursor is in.
    isActive: jest.fn((name: string, attrs?: Record<string, unknown>) => (
      name === 'bulletList' && activeIn !== null && attrs?.listStyle === activeIn.listStyle
    )),
  } as unknown as Editor
  return { editor, calls }
}

test('is a button named "Dashed list" with a tooltip', () => {
  const { editor } = fakeEditor(null)
  render(<DashedListButton editor={editor} />)
  const button = screen.getByRole('button', { name: 'Dashed list' })
  expect(button).toHaveAttribute('title', 'Dashed list')
  expect(button).toHaveAttribute('type', 'button')
})

test('is not pressed outside a dashed list, and pressed inside one', () => {
  const { editor } = fakeEditor({ listStyle: 'bullet' })
  const { unmount } = render(<DashedListButton editor={editor} />)
  expect(screen.getByRole('button', { name: 'Dashed list' })).toHaveAttribute('aria-pressed', 'false')
  unmount()

  const dashed = fakeEditor({ listStyle: 'dashed' })
  render(<DashedListButton editor={dashed.editor} />)
  expect(screen.getByRole('button', { name: 'Dashed list' })).toHaveAttribute('aria-pressed', 'true')
  expect(dashed.editor.isActive).toHaveBeenCalledWith('bulletList', { listStyle: 'dashed' })
})

test('clicking it focuses the editor and toggles the dashed list', () => {
  const { editor, calls } = fakeEditor(null)
  render(<DashedListButton editor={editor} />)
  fireEvent.click(screen.getByRole('button', { name: 'Dashed list' }))
  expect(calls).toEqual(['focus', 'toggleDashedList'])
})

test('is a native button, so it is reached with Tab and the icon is hidden from screen readers', () => {
  const { editor } = fakeEditor(null)
  const { container } = render(<DashedListButton editor={editor} />)
  const button = screen.getByRole('button', { name: 'Dashed list' })
  expect(button.tagName).toBe('BUTTON')
  expect(button).not.toHaveAttribute('tabindex', '-1')
  expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
})
