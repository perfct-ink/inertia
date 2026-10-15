import { PLANNING_STATUSES, healthLabel } from './milestone'

test('health labels read naturally', () => {
  expect(healthLabel('on_track')).toBe('On track')
  expect(healthLabel('at_risk')).toBe('At risk')
  expect(healthLabel('off_track')).toBe('Off track')
})

test('statuses run from planned to done', () => {
  expect(PLANNING_STATUSES).toEqual(['planned', 'active', 'done'])
})
