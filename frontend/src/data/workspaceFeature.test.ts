import { ALL_WORKSPACE_FEATURES, WORKSPACE_FEATURE_GROUPS, enabledFeatures, featureOn, featuresChanged, quickAddTypes, toggleFeature } from './workspaceFeature'

test('lists the thirteen optional pages once each, in rail order, grouped as the rail groups them', () => {
  expect(ALL_WORKSPACE_FEATURES).toEqual([
    'events',
    'roadmap', 'timeline', 'milestones', 'initiatives', 'epics', 'sprints', 'hierarchy',
    'okrs', 'objectives_map', 'ideas',
    'resources', 'workload',
  ])
  expect(WORKSPACE_FEATURE_GROUPS.map((g) => g.heading)).toEqual(['Scheduling', 'Planning', 'Goals', 'Delivery'])
  expect(WORKSPACE_FEATURE_GROUPS.every((g) => g.features.every((f) => f.label.length > 0))).toBe(true)
})

test('a Space with no list (still loading, older server) shows everything', () => {
  expect(featureOn(undefined, 'sprints')).toBe(true)
  expect(featureOn(null, 'sprints')).toBe(true)
  expect(featureOn({}, 'sprints')).toBe(true)
  expect(enabledFeatures({})).toEqual(ALL_WORKSPACE_FEATURES)
})

test('a Space with a list shows only the pages on it', () => {
  expect(featureOn({ features: ['events'] }, 'sprints')).toBe(false)
  expect(featureOn({ features: ['events'] }, 'events')).toBe(true)
  expect(featureOn({ features: [] }, 'events')).toBe(false)
  expect(enabledFeatures({ features: ['okrs', 'events'] })).toEqual(['events', 'okrs'])
})

test('a page that is not optional is always on', () => {
  expect(featureOn({ features: [] }, undefined)).toBe(true)
})

test('toggleFeature adds or removes one and keeps rail order', () => {
  expect(toggleFeature(['okrs', 'events'], 'epics', true)).toEqual(['events', 'epics', 'okrs'])
  expect(toggleFeature(['events', 'okrs'], 'events', false)).toEqual(['okrs'])
  expect(toggleFeature([], 'roadmap', true)).toEqual(['roadmap'])
})

test('quick add makes an event only when Events is on', () => {
  expect(quickAddTypes(undefined)).toEqual(['task', 'event'])
  expect(quickAddTypes({ features: ['events'] })).toEqual(['task', 'event'])
  expect(quickAddTypes({ features: ['sprints'] })).toEqual(['task'])
})

test('featuresChanged ignores order and compares the contents', () => {
  expect(featuresChanged(['events', 'okrs'], ['okrs', 'events'])).toBe(false)
  expect(featuresChanged(['events'], ['events', 'okrs'])).toBe(true)
  expect(featuresChanged(['events', 'okrs'], ['events', 'sprints'])).toBe(true)
  expect(featuresChanged([], [])).toBe(false)
})
