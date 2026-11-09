import '@testing-library/jest-dom'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SidebarRail } from './SidebarRail'
import { SECTION_GROUPS } from './projectSections'

let mockShared = true
let mockFeatures: string[] | undefined
jest.mock('@/api/notifications', () => ({ useNotifications: () => ({ data: { unread_count: 0, notifications: [] } }) }))
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: { shared: mockShared, features: mockFeatures } }) }))
beforeEach(() => { mockShared = true; mockFeatures = undefined })

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

test('pages the Space turned off are left out of the rail, and the ones that are always on stay', () => {
  mockFeatures = ['events', 'roadmap', 'okrs']
  renderAt('/space')
  const nav = screen.getByRole('navigation', { name: 'Pages' })
  const labels = within(nav).getAllByRole('link').map((a) => a.getAttribute('aria-label'))
  expect(labels).toEqual(['Projects', 'My work', 'Tasks', 'Task table', 'Pivot', 'Calendar', 'Events', 'Roadmap', 'OKRs', 'Inbox'])
  expect(within(nav).queryByRole('link', { name: 'Sprints' })).not.toBeInTheDocument()
})

test('a Space with every optional page off still has its tasks, projects and inbox', () => {
  mockFeatures = []
  renderAt('/space')
  const nav = screen.getByRole('navigation', { name: 'Pages' })
  const labels = within(nav).getAllByRole('link').map((a) => a.getAttribute('aria-label'))
  expect(labels).toEqual(['Projects', 'My work', 'Tasks', 'Task table', 'Pivot', 'Calendar', 'Inbox'])
  // A group with nothing left in it draws no divider.
  expect(within(nav).getAllByRole('separator')).toHaveLength(2)
})

test('Workload needs both a shared Space and the feature on', () => {
  mockShared = false
  renderAt('/space')
  expect(screen.queryByRole('link', { name: 'Workload' })).not.toBeInTheDocument()
  cleanup()
  mockShared = true
  mockFeatures = ['events']
  renderAt('/space')
  expect(screen.queryByRole('link', { name: 'Workload' })).not.toBeInTheDocument()
  cleanup()
  mockFeatures = ['workload']
  renderAt('/space')
  expect(screen.getByRole('link', { name: 'Workload' })).toBeInTheDocument()
})
