import { projectIconOf } from './project'

test('an image wins over an emoji; neither means the default icon', () => {
  expect(projectIconOf({ icon: '🚀', image_url: 'https://x.test/a.png' })).toEqual({ image: 'https://x.test/a.png' })
  expect(projectIconOf({ icon: ' 🚀 ' })).toEqual({ emoji: '🚀' })
  expect(projectIconOf({ icon: '  ', image_url: null })).toBeNull()
})
