import { sharedRoadmapUrl } from './share'

test('builds the public link from the origin and token', () => {
  expect(sharedRoadmapUrl('https://app.example.com', 'abc123')).toBe('https://app.example.com/shared/abc123')
})
