import { isActivePath, projectIconOf } from './project'

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
