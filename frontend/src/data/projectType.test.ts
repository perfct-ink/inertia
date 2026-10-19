import { PROJECT_TYPES, projectTypeLabel } from './projectType'

test('lists every project type once, blank first', () => {
  const values = PROJECT_TYPES.map((t) => t.value)
  expect(values[0]).toBe('blank')
  expect(new Set(values).size).toBe(values.length)
  expect(values).toEqual(expect.arrayContaining(['software', 'music_release', 'video', 'event', 'marketing_campaign', 'writing', 'personal']))
})

test('labels types, defaulting to Blank', () => {
  expect(projectTypeLabel('music_release')).toBe('Music release')
  expect(projectTypeLabel(undefined)).toBe('Blank')
})
