import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SidebarRail } from './SidebarRail'
import { SECTION_GROUPS } from './projectSections'

let mockShared = true
jest.mock('@/api/notifications', () => ({ useNotifications: () => ({ data: { unread_count: 0, notifications: [] } }) }))
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: { shared: mockShared } }) }))
beforeEach(() => { mockShared = true })

function renderAt(path: string, handlers = { onQuickAdd: jest.fn(), onShortcuts: jest.fn() }) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <SidebarRail {...handlers} />
    </MemoryRouter>
  )
  return handlers
}

test('has a link for the Space pages and every page of a project, and no buttons for them', () => {
  renderAt('/space')
  const nav = screen.getByRole('navigation', { name: 'Pages' })
  const labels = within(nav).getAllByRole('link').map((a) => a.getAttribute('aria-label'))
  expect(labels).toEqual([
    'Projects',
    ...SECTION_GROUPS.flatMap((g) => g.sections.map((s) => s.label)),
    'Inbox',
  ])
  expect(within(nav).getByRole('link', { name: 'Tasks' })).toHaveAttribute('href', '/tasks?view=backlog')
  expect(within(nav).getByRole('link', { name: 'Roadmap' })).toHaveAttribute('href', '/roadmap')
  expect(within(nav).getByRole('link', { name: 'Retrospectives' })).toHaveAttribute('href', '/retrospectives')
})

test('the Inbox link sits with the quick actions', () => {
  renderAt('/space')
  expect(screen.getByRole('link', { name: 'Inbox' })).toHaveAttribute('href', '/inbox')
})

test('My work shows only when the Space is shared with others', () => {
  renderAt('/space')
  expect(screen.getByRole('link', { name: 'My work' })).toBeInTheDocument()
})

test('My work is hidden when only you can open the Space', () => {
  mockShared = false
  renderAt('/space')
  expect(screen.queryByRole('link', { name: 'My work' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: 'All files' })).not.toBeInTheDocument()
})

test('marks the page you are on as current', () => {
  renderAt('/roadmap')
  expect(screen.getByRole('link', { name: 'Roadmap' })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: 'Roadmap' })).toHaveClass('sidebar-rail_button--active')
  expect(screen.getByRole('link', { name: 'Projects' })).not.toHaveAttribute('aria-current')
  expect(document.querySelectorAll('[aria-current="page"]')).toHaveLength(1)
})

test('a page with a query in its link is current without it', () => {
  renderAt('/tasks')
  expect(screen.getByRole('link', { name: 'Tasks' })).toHaveAttribute('aria-current', 'page')
})

test('no page is current away from every section', () => {
  renderAt('/documents/7')
  expect(document.querySelector('[aria-current="page"]')).toBeNull()
})

test('the quick actions run the handlers they are given', () => {
  const { onQuickAdd, onShortcuts } = renderAt('/space')
  fireEvent.click(screen.getByRole('button', { name: 'Quick add' }))
  expect(onQuickAdd).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }))
  expect(onShortcuts).toHaveBeenCalledTimes(1)
})

test('every button names itself for people who cannot see the icon', () => {
  renderAt('/space')
  const nav = screen.getByRole('navigation', { name: 'Pages' })
  for (const el of within(nav).getAllByRole('link')) expect(el).toHaveAttribute('title', el.getAttribute('aria-label'))
})
