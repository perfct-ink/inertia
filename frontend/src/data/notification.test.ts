import { notificationAge, notificationPath } from './notification'

test('opens tasks on the Workboard and documents directly, else nowhere', () => {
  expect(notificationPath('Task', 4)).toBe('/tasks?view=kanban')
  expect(notificationPath('Document', 9)).toBe('/documents/9')
  expect(notificationPath('Sprint', 1)).toBeNull()
  expect(notificationPath(null, null)).toBeNull()
})

test('age reads as a relative time', () => {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  expect(notificationAge({ created_at: tenMinutesAgo })).toBe('10 minutes ago')
})
