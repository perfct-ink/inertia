import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import TabBar from './TabBar'
import { useTabsStore } from '@/store/tabs'

// react-router-dom needs browser APIs jsdom lacks; TabBar only uses useNavigate.
jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }))

beforeEach(() => {
  useTabsStore.setState({
    tabs: [{ id: 'd1', path: '/documents/1', title: 'Plan' }, { id: 'd2', path: '/documents/2', title: 'Notes' }],
    activeId: 'd1',
  })
})

function renderBar() {
  render(<TabBar />)
}

test('each tab has a labelled select button and a separate close button', () => {
  renderBar()
  expect(screen.getByRole('button', { name: 'Plan' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('button', { name: 'Close Plan' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Notes' })).not.toHaveAttribute('aria-current')
})

test('closing a tab removes it', () => {
  renderBar()
  fireEvent.click(screen.getByRole('button', { name: 'Close Notes' }))
  expect(useTabsStore.getState().tabs.map((t) => t.id)).toEqual(['d1'])
})
