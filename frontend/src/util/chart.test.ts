import { areaPath, axisTicks, labelIndexes, linePath, nearestIndex, niceStep, scaleLinear, stackBands } from './chart'

test('a tick step is 1, 2 or 5 times a power of ten and never below one', () => {
  expect(niceStep(13)).toBe(5)
  expect(niceStep(40)).toBe(10)
  expect(niceStep(7)).toBe(2)
  expect(niceStep(3)).toBe(1)
  expect(niceStep(0)).toBe(1)
  expect(niceStep(400)).toBe(100)
})

test('axis ticks start at 0 and end at or past the maximum', () => {
  expect(axisTicks(13)).toEqual([0, 5, 10, 15])
  expect(axisTicks(3)).toEqual([0, 1, 2, 3])
  expect(axisTicks(40)).toEqual([0, 10, 20, 30, 40])
  expect(axisTicks(0)).toEqual([0, 1])
})

test('a scale maps linearly, backwards for a y axis, and does not divide by zero', () => {
  const y = scaleLinear([0, 20], [100, 0])
  expect(y(0)).toBe(100)
  expect(y(20)).toBe(0)
  expect(y(5)).toBe(75)
  expect(scaleLinear([5, 5], [10, 20])(5)).toBe(10)
})

test('paths run through the points, and a band closes back along the lower edge', () => {
  const upper = [{ x: 0, y: 10 }, { x: 10, y: 5.123 }]
  const lower = [{ x: 0, y: 20 }, { x: 10, y: 20 }]
  expect(linePath(upper)).toBe('M 0 10 L 10 5.1')
  expect(linePath([])).toBe('')
  expect(areaPath(upper, lower)).toBe('M 0 10 L 10 5.1 L 10 20 L 0 20 Z')
  expect(areaPath([], [])).toBe('')
})

test('labels are spread evenly so that no more than the maximum show', () => {
  expect(labelIndexes(5, 6)).toEqual([0, 1, 2, 3, 4])
  expect(labelIndexes(14, 5)).toEqual([0, 4, 8, 12])
  expect(labelIndexes(1, 5)).toEqual([0])
  expect(labelIndexes(0, 5)).toEqual([])
})

test('the nearest index clamps to the ends', () => {
  expect(nearestIndex(0, 10, 110, 5)).toBe(0)
  expect(nearestIndex(60, 10, 110, 5)).toBe(2)
  expect(nearestIndex(500, 10, 110, 5)).toBe(4)
  expect(nearestIndex(50, 10, 110, 1)).toBe(0)
})

test('stacked bands sit on top of each other, the first on the axis', () => {
  const [a, b] = stackBands([[1, 2], [3, 1]])
  expect(a).toEqual({ lower: [0, 0], upper: [1, 2] })
  expect(b).toEqual({ lower: [1, 2], upper: [4, 3] })
  expect(stackBands([])).toEqual([])
})
