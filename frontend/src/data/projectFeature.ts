import type { Folder } from '@/types'

// The pages a project can turn off; mirrors Folder::PROJECT_FEATURES in the
// backend. A project's own files, its Overview and All files are always on.
export type ProjectFeature =
  | 'my_work' | 'tasks' | 'task_table' | 'pivot' | 'calendar' | 'events'
  | 'roadmap' | 'timeline' | 'milestones' | 'initiatives' | 'epics' | 'sprints' | 'hierarchy'
  | 'okrs' | 'objectives_map' | 'ideas' | 'releases' | 'resources'

export interface ProjectFeatureDef {
  key: ProjectFeature
  label: string
  // The page under an open project (a hidden page still opens from its link).
  path: string
}

export interface ProjectFeatureGroup {
  // The sidebar heading; the first group has none.
  heading: string | null
  features: ProjectFeatureDef[]
}

// The features in sidebar order, grouped as the sidebar shows them.
export const PROJECT_FEATURE_GROUPS: ProjectFeatureGroup[] = [
  { heading: null, features: [
    { key: 'my_work', label: 'My work', path: '/my-work' },
  ] },
  { heading: 'Tasks', features: [
    { key: 'tasks', label: 'Tasks', path: '/tasks?view=backlog' },
    { key: 'task_table', label: 'Task table', path: '/task-table' },
    { key: 'pivot', label: 'Pivot', path: '/pivot' },
    { key: 'calendar', label: 'Calendar', path: '/calendar' },
    { key: 'events', label: 'Events', path: '/events?view=list' },
  ] },
  { heading: 'Planning', features: [
    { key: 'roadmap', label: 'Roadmap', path: '/roadmap' },
    { key: 'timeline', label: 'Timeline', path: '/timeline' },
    { key: 'milestones', label: 'Milestones', path: '/milestones' },
    { key: 'initiatives', label: 'Initiatives', path: '/initiatives' },
    { key: 'epics', label: 'Epics', path: '/epics' },
    { key: 'sprints', label: 'Sprints', path: '/sprints' },
    { key: 'hierarchy', label: 'Hierarchy', path: '/hierarchy' },
  ] },
  { heading: 'Goals', features: [
    { key: 'okrs', label: 'OKRs', path: '/okrs' },
    { key: 'objectives_map', label: 'Objectives map', path: '/objectives-map' },
    { key: 'ideas', label: 'Ideas', path: '/ideas' },
  ] },
  { heading: 'Delivery', features: [
    { key: 'releases', label: 'Releases', path: '/releases' },
    { key: 'resources', label: 'Resources', path: '/resources' },
  ] },
]

export const ALL_PROJECT_FEATURES: ProjectFeature[] = PROJECT_FEATURE_GROUPS.flatMap((g) => g.features.map((f) => f.key))

// Whether a project shows a feature. A project with no list (it never chose,
// an older server, or none open) shows everything.
export function projectFeatureOn(project: Pick<Folder, 'features'> | null | undefined, feature: ProjectFeature): boolean {
  return !project?.features || project.features.includes(feature)
}

// The features a project shows, in sidebar order.
export function enabledProjectFeatures(project: Pick<Folder, 'features'> | null | undefined): ProjectFeature[] {
  return ALL_PROJECT_FEATURES.filter((feature) => projectFeatureOn(project, feature))
}

// The list after switching one feature on or off, in sidebar order.
export function toggleProjectFeature(current: ProjectFeature[], feature: ProjectFeature, on: boolean): ProjectFeature[] {
  return ALL_PROJECT_FEATURES.filter((f) => (f === feature ? on : current.includes(f)))
}

// What the quick-add box can make in a project: a task needs Tasks on and an
// event needs Events on. With no project open it offers both.
export function quickAddTypesOf(project: Pick<Folder, 'features'> | null | undefined): ('task' | 'event')[] {
  const types: ('task' | 'event')[] = []
  if (projectFeatureOn(project, 'tasks')) types.push('task')
  if (projectFeatureOn(project, 'events')) types.push('event')
  return types
}

// The sidebar groups with only the features the project shows. A group that
// would be empty is dropped, except the first, which also holds All files.
export function projectFeatureGroups(project: Pick<Folder, 'features'> | null | undefined): ProjectFeatureGroup[] {
  return PROJECT_FEATURE_GROUPS
    .map((group) => ({ ...group, features: group.features.filter((f) => projectFeatureOn(project, f.key)) }))
    .filter((group) => group.heading === null || group.features.length > 0)
}
