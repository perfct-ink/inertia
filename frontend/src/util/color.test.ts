import { colorForUserId } from './color'

test('a user always gets the same color and different users differ', () => {
  expect(colorForUserId(3)).toBe(colorForUserId(3))
  expect(colorForUserId(3)).not.toBe(colorForUserId(4))
  expect(colorForUserId(undefined)).toBe('hsl(0, 70%, 45%)')
})
