import { isActivePath, PORTFOLIO_COLUMNS, projectIconOf, sortPortfolio } from './project'

test('an image wins over an emoji; neither means the default icon', () => {
  expect(projectIconOf({ icon: '🚀', image_url: 'https://x.test/a.png' })).toEqual({ image: 'https://x.test/a.png' })
  expect(projectIconOf({ icon: ' 🚀 ' })).toEqual({ emoji: '🚀' })
  expect(projectIconOf({ icon: '  ', image_url: null })).toBeNull()
})

test('a link is the active page when its path matches, whatever its query', () => {
  expect(isActivePath('/tasks', '/tasks?view=backlog')).toBe(true)
  expect(isActivePath('/events', '/events?view=list')).toBe(true)
  expect(isActivePath('/roadmap', '/roadmap')).toBe(true)
  expect(isActivePath('/roadmap/2', '/roadmap')).toBe(false)
  expect(isActivePath('/documents/4', '/documents')).toBe(false)
})
import { PROJECT_STATUSES, projectStatusLabel } from './project'

test('labels each status, defaulting to Planned', () => {
  expect(PROJECT_STATUSES.map((s) => s.value)).toEqual(['planned', 'active', 'on_hold', 'done'])
  expect(projectStatusLabel('on_hold')).toBe('On hold')
  expect(projectStatusLabel(undefined)).toBe('Planned')
})

test('sortPortfolio orders by each column and leaves blanks last', () => {
  const row = (name: string, owner_name: string | null, project_status: 'planned' | 'active' | 'on_hold' | 'done', target_date: string | null, percent: number) =>
    ({ name, owner_name, project_status, target_date, percent })
  const rows = [row('B', 'Zed', 'done', '2026-12-01', 50), row('A', null, 'active', null, 10), row('C', 'Amy', 'planned', '2026-11-01', 90)]
  expect(sortPortfolio(rows, 'name', 'asc').map((r) => r.name)).toEqual(['A', 'B', 'C'])
  expect(sortPortfolio(rows, 'owner', 'asc').map((r) => r.name)).toEqual(['C', 'B', 'A'])
  expect(sortPortfolio(rows, 'owner', 'desc').map((r) => r.name)).toEqual(['B', 'C', 'A'])
  expect(sortPortfolio(rows, 'target_date', 'asc').map((r) => r.name)).toEqual(['C', 'B', 'A'])
  expect(sortPortfolio(rows, 'status', 'asc').map((r) => r.name)).toEqual(['C', 'A', 'B'])
  expect(sortPortfolio(rows, 'percent', 'desc').map((r) => r.name)).toEqual(['C', 'B', 'A'])
  expect(rows.map((r) => r.name)).toEqual(['B', 'A', 'C'])
})

test('the portfolio columns are the sort keys, in table order', () => {
  expect(PORTFOLIO_COLUMNS.map((c) => c.key)).toEqual(['name', 'owner', 'status', 'target_date', 'percent'])
})
