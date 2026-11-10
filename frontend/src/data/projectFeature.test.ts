import { SECTION_GROUPS } from '@/components/file-manager/projectSections'
import { ALL_PROJECT_FEATURES, PROJECT_FEATURE_GROUPS, enabledProjectFeatures, projectFeatureOn, quickAddTypesOf, toggleProjectFeature } from './projectFeature'

test('every page of the rail has a feature, in the same order and groups', () => {
  expect(SECTION_GROUPS.flatMap((g) => g.sections.map((s) => s.feature))).toEqual(ALL_PROJECT_FEATURES)
  expect(SECTION_GROUPS.map((g) => g.heading)).toEqual(PROJECT_FEATURE_GROUPS.map((g) => g.heading))
  expect(new Set(ALL_PROJECT_FEATURES).size).toBe(ALL_PROJECT_FEATURES.length)
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

test('toggleProjectFeature adds or removes one and keeps the rail order', () => {
  expect(toggleProjectFeature(['okrs', 'events'], 'epics', true)).toEqual(['events', 'epics', 'okrs'])
  expect(toggleProjectFeature(['events', 'okrs'], 'events', false)).toEqual(['okrs'])
})

test('quick add offers a task or event only when the project shows Tasks or Events', () => {
  expect(quickAddTypesOf(null)).toEqual(['task', 'event'])
  expect(quickAddTypesOf({ features: ['events', 'okrs'] })).toEqual(['event'])
  expect(quickAddTypesOf({ features: ['okrs'] })).toEqual([])
})
