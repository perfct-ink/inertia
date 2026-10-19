import { PROJECT_STATUSES, projectStatusLabel } from './project'

test('labels each status, defaulting to Planned', () => {
  expect(PROJECT_STATUSES.map((s) => s.value)).toEqual(['planned', 'active', 'on_hold', 'done'])
  expect(projectStatusLabel('on_hold')).toBe('On hold')
  expect(projectStatusLabel(undefined)).toBe('Planned')
})
