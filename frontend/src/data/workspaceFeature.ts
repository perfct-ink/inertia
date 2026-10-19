import type { WorkspaceSummary } from '@/types'

// The optional sections a Space can turn off; mirrors Workspace::FEATURES in the
// backend. Everything else (documents, tasks, projects, ...) is always on.
export type WorkspaceFeature = 'events' | 'epics' | 'initiatives' | 'milestones' | 'sprints' | 'okrs' | 'roadmap' | 'hierarchy'

export const WORKSPACE_FEATURES: { key: WorkspaceFeature; label: string }[] = [
  { key: 'events', label: 'Events' },
  { key: 'epics', label: 'Epics' },
  { key: 'initiatives', label: 'Initiatives' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'sprints', label: 'Sprints' },
  { key: 'okrs', label: 'OKRs' },
  { key: 'roadmap', label: 'Roadmap' },
  { key: 'hierarchy', label: 'Hierarchy' },
]

export const ALL_FEATURES: WorkspaceFeature[] = WORKSPACE_FEATURES.map((f) => f.key)

// Whether a Space shows a feature. A Space whose payload has no list (an older
// server, or still loading) shows everything.
export function featureOn(workspace: Pick<WorkspaceSummary, 'features'> | undefined, feature: WorkspaceFeature): boolean {
  return !workspace?.features || workspace.features.includes(feature)
}

// The list after switching one feature on or off, in the canonical order.
export function toggleFeature(current: WorkspaceFeature[], feature: WorkspaceFeature, on: boolean): WorkspaceFeature[] {
  return ALL_FEATURES.filter((f) => (f === feature ? on : current.includes(f)))
}
