import {
  ALL_PROJECT_FEATURES, PROJECT_FEATURE_GROUPS, enabledProjectFeatures, projectFeatureGroups, projectFeatureOn, quickAddTypesOf, toggleProjectFeature,
} from './projectFeature'

test('lists the eighteen pages once each, every one with a label and a path', () => {
  expect(ALL_PROJECT_FEATURES).toHaveLength(18)
  expect(new Set(ALL_PROJECT_FEATURES).size).toBe(18)
  const defs = PROJECT_FEATURE_GROUPS.flatMap((g) => g.features)
  expect(defs.every((f) => f.label.length > 0 && f.path.startsWith('/'))).toBe(true)
  expect(new Set(defs.map((f) => f.path.split('?')[0])).size).toBe(18)
})

test('a project with no list, or none open, shows everything', () => {
  expect(projectFeatureOn(undefined, 'sprints')).toBe(true)
  expect(projectFeatureOn(null, 'sprints')).toBe(true)
  expect(projectFeatureOn({}, 'sprints')).toBe(true)
  expect(projectFeatureOn({ features: null }, 'sprints')).toBe(true)
  expect(enabledProjectFeatures({})).toEqual(ALL_PROJECT_FEATURES)
})

test('a project with a list shows only what is in it', () => {
  expect(projectFeatureOn({ features: ['events'] }, 'sprints')).toBe(false)
  expect(projectFeatureOn({ features: ['events'] }, 'events')).toBe(true)
  expect(projectFeatureOn({ features: [] }, 'events')).toBe(false)
  expect(enabledProjectFeatures({ features: ['sprints', 'tasks'] })).toEqual(['tasks', 'sprints'])
})

test('toggleProjectFeature adds or removes one and keeps the sidebar order', () => {
  expect(toggleProjectFeature(['okrs', 'events'], 'epics', true)).toEqual(['events', 'epics', 'okrs'])
  expect(toggleProjectFeature(['events', 'okrs'], 'events', false)).toEqual(['okrs'])
  expect(toggleProjectFeature([], 'roadmap', true)).toEqual(['roadmap'])
})

test('quick add offers a task or event only when the project shows Tasks or Events', () => {
  expect(quickAddTypesOf(null)).toEqual(['task', 'event'])
  expect(quickAddTypesOf({})).toEqual(['task', 'event'])
  expect(quickAddTypesOf({ features: ['events', 'okrs'] })).toEqual(['event'])
  expect(quickAddTypesOf({ features: ['tasks'] })).toEqual(['task'])
  expect(quickAddTypesOf({ features: ['okrs'] })).toEqual([])
})

test('projectFeatureGroups keeps the groups in order and drops the ones left empty', () => {
  expect(projectFeatureGroups({}).map((g) => g.heading)).toEqual([null, 'Tasks', 'Planning', 'Goals', 'Delivery'])

  const groups = projectFeatureGroups({ features: ['tasks', 'okrs', 'ideas'] })
  expect(groups.map((g) => g.heading)).toEqual([null, 'Tasks', 'Goals'])
  expect(groups[0].features).toEqual([])
  expect(groups[2].features.map((f) => f.label)).toEqual(['OKRs', 'Ideas'])

  // Nothing on: only the first group stays, since All files lives there.
  expect(projectFeatureGroups({ features: [] }).map((g) => g.heading)).toEqual([null])
})
