import type { WorkspaceSummary } from '@/types'

// The optional pages a Space can turn off; mirrors Workspace::FEATURES in the
// backend. Tasks, files, projects and the inbox are always on. A page that is off
// leaves the sidebar rail and quick add; its records are kept.
export type WorkspaceFeature =
  | 'events'
  | 'roadmap' | 'timeline' | 'milestones' | 'initiatives' | 'epics' | 'sprints' | 'hierarchy'
  | 'okrs' | 'objectives_map' | 'ideas'
  | 'resources' | 'workload'

export interface WorkspaceFeatureGroup {
  // The rail's heading for these pages (Events sits under the rail's Tasks, but
  // Tasks itself is always on, so the checklist calls its group Scheduling).
  heading: string
  features: { key: WorkspaceFeature; label: string }[]
}

// In rail order, grouped as the rail groups them. The same list drives the
// New Space checklist and the Space's Features dialog.
export const WORKSPACE_FEATURE_GROUPS: WorkspaceFeatureGroup[] = [
  { heading: 'Scheduling', features: [
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

export const ALL_WORKSPACE_FEATURES: WorkspaceFeature[] = WORKSPACE_FEATURE_GROUPS.flatMap((g) => g.features.map((f) => f.key))

type HasFeatures = Pick<WorkspaceSummary, 'features'>

// Whether a Space shows a feature. A Space whose payload has no list (an older
// server, or still loading) shows everything, and so does a page that is not
// optional (no feature named).
export function featureOn(workspace: HasFeatures | null | undefined, feature: WorkspaceFeature | undefined): boolean {
  return !feature || !workspace?.features || workspace.features.includes(feature)
}

// The features a Space shows, in rail order.
export function enabledFeatures(workspace: HasFeatures | null | undefined): WorkspaceFeature[] {
  return ALL_WORKSPACE_FEATURES.filter((feature) => featureOn(workspace, feature))
}

// The list after switching one feature on or off, in rail order.
export function toggleFeature(current: WorkspaceFeature[], feature: WorkspaceFeature, on: boolean): WorkspaceFeature[] {
  return ALL_WORKSPACE_FEATURES.filter((f) => (f === feature ? on : current.includes(f)))
}

// What the quick-add box can make: a task always; an event needs Events on.
export function quickAddTypes(workspace: HasFeatures | null | undefined): ('task' | 'event')[] {
  return featureOn(workspace, 'events') ? ['task', 'event'] : ['task']
}

// Whether the list differs from what the Space already has (the Save button
// stays off until it does).
export function featuresChanged(saved: WorkspaceFeature[], draft: WorkspaceFeature[]): boolean {
  return saved.length !== draft.length || saved.some((f) => !draft.includes(f))
}
