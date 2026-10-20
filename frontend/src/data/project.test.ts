import { PROJECT_STATUSES, projectStatusLabel, sortPortfolio } from './project'

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
