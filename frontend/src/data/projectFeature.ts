import type { Folder } from '@/types'

// The pages a project can turn off (docs/features/project_features.md); mirrors
// Folder::PROJECT_FEATURES in the backend. A project's own files, its Overview
// and All files are always on. The rail and the sidebar find each page's
// feature through `feature` in components/file-manager/projectSections.ts.
export type ProjectFeature =
  | 'my_work' | 'tasks' | 'task_table' | 'pivot' | 'calendar' | 'events'
  | 'roadmap' | 'timeline' | 'milestones' | 'initiatives' | 'epics' | 'sprints' | 'hierarchy'
  | 'okrs' | 'objectives_map' | 'ideas' | 'resources' | 'workload'

export interface ProjectFeatureDef {
  key: ProjectFeature
  label: string
}

export interface ProjectFeatureGroup {
  // The rail's group heading; the first group has none.
  heading: string | null
  features: ProjectFeatureDef[]
}

// The features in the rail's order, grouped as the rail groups them.
export const PROJECT_FEATURE_GROUPS: ProjectFeatureGroup[] = [
  { heading: null, features: [{ key: 'my_work', label: 'My work' }] },
  { heading: 'Tasks', features: [
    { key: 'tasks', label: 'Tasks' },
    { key: 'task_table', label: 'Task table' },
    { key: 'pivot', label: 'Pivot' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'events', label: 'Events' },
  ] },
  { heading: 'Planning', features: [
    { key: 'roadmap', label: 'Roadmap' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'milestones', label: 'Milestones' },
    { key: 'initiatives', label: 'Initiatives' },
    { key: 'epics', label: 'Epics' },
    { key: 'sprints', label: 'Sprints' },
    { key: 'hierarchy', label: 'Hierarchy' },
  ] },
  { heading: 'Goals', features: [
    { key: 'okrs', label: 'OKRs' },
    { key: 'objectives_map', label: 'Objectives map' },
    { key: 'ideas', label: 'Ideas' },
  ] },
  { heading: 'Delivery', features: [
    { key: 'resources', label: 'Resources' },
    { key: 'workload', label: 'Workload' },
  ] },
]

export const ALL_PROJECT_FEATURES: ProjectFeature[] = PROJECT_FEATURE_GROUPS.flatMap((g) => g.features.map((f) => f.key))

// Whether a project shows a feature. No project open, or a project with no list
// (it never chose, or an older server), shows everything.
export function projectFeatureOn(project: Pick<Folder, 'features'> | null | undefined, feature: ProjectFeature): boolean {
  return !project?.features || project.features.includes(feature)
}

// The features a project shows, in the rail's order.
export function enabledProjectFeatures(project: Pick<Folder, 'features'> | null | undefined): ProjectFeature[] {
  return ALL_PROJECT_FEATURES.filter((feature) => projectFeatureOn(project, feature))
}

// The list after switching one feature on or off, in the rail's order.
export function toggleProjectFeature(current: ProjectFeature[], feature: ProjectFeature, on: boolean): ProjectFeature[] {
  return ALL_PROJECT_FEATURES.filter((f) => (f === feature ? on : current.includes(f)))
}

// What quick add can make in the open project: a task needs Tasks on and an
// event needs Events on. With no project open it offers both.
export function quickAddTypesOf(project: Pick<Folder, 'features'> | null | undefined): ('task' | 'event')[] {
  const types: ('task' | 'event')[] = []
  if (projectFeatureOn(project, 'tasks')) types.push('task')
  if (projectFeatureOn(project, 'events')) types.push('event')
  return types
}
