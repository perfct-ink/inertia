import { ALL_FEATURES, featureOn, toggleFeature, WORKSPACE_FEATURES } from './workspaceFeature'

test('lists the eight optional sections once each', () => {
  expect(ALL_FEATURES).toEqual(['events', 'epics', 'initiatives', 'milestones', 'sprints', 'okrs', 'roadmap', 'hierarchy'])
  expect(WORKSPACE_FEATURES.every((f) => f.label.length > 0)).toBe(true)
})

test('a Space with no list (still loading, older server) shows everything', () => {
  expect(featureOn(undefined, 'sprints')).toBe(true)
  expect(featureOn({}, 'sprints')).toBe(true)
  expect(featureOn({ features: ['events'] }, 'sprints')).toBe(false)
  expect(featureOn({ features: ['events'] }, 'events')).toBe(true)
})

test('toggleFeature adds or removes one and keeps the canonical order', () => {
  expect(toggleFeature(['okrs', 'events'], 'epics', true)).toEqual(['events', 'epics', 'okrs'])
  expect(toggleFeature(['events', 'okrs'], 'events', false)).toEqual(['okrs'])
  expect(toggleFeature([], 'roadmap', true)).toEqual(['roadmap'])
})
