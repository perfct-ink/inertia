import type { ComponentType } from 'react'
import {
  CalendarDays, CalendarRange, CheckSquare, Flag, Gauge, GanttChart, Goal, Lightbulb, ListTree, Map as MapIcon,
  Milestone, Network, Rocket, Rows3, Table2, Target, UserCheck, Users,
} from 'lucide-react'
import { featureOn, type WorkspaceFeature } from '@/data/workspaceFeature'
import type { Workspace } from '@/types'

export type Section = {
  label: string
  path: string
  icon: ComponentType<{ className?: string }>
  // Only useful when other people can open the Space, so hidden until then.
  sharedOnly?: boolean
  // The Space setting that turns this page off (docs/features/space_features.md).
  // Left out for the pages that are always on.
  feature?: WorkspaceFeature
}

export const TASKS_HEADING = 'Tasks'

// The pages under an open project, grouped by what they're for. Each lists
// only that project's records (the API reads X-Project-Id, see backend
// ProjectScoped). The first group has no heading. Shown on the icon rail
// (SidebarRail).
export const SECTION_GROUPS: { heading: string | null; sections: Section[] }[] = [
  { heading: null, sections: [
    { label: 'My work', path: '/my-work', icon: UserCheck, sharedOnly: true },
  ] },
  { heading: TASKS_HEADING, sections: [
    { label: 'Tasks', path: '/tasks?view=backlog', icon: CheckSquare },
    { label: 'Task table', path: '/task-table', icon: Rows3 },
    { label: 'Pivot', path: '/pivot', icon: Table2 },
    { label: 'Calendar', path: '/calendar', icon: CalendarRange },
    { label: 'Events', path: '/events?view=list', icon: CalendarDays, feature: 'events' },
  ] },
  { heading: 'Planning', sections: [
    { label: 'Roadmap', path: '/roadmap', icon: MapIcon, feature: 'roadmap' },
    { label: 'Timeline', path: '/timeline', icon: GanttChart, feature: 'timeline' },
    { label: 'Milestones', path: '/milestones', icon: Milestone, feature: 'milestones' },
    { label: 'Initiatives', path: '/initiatives', icon: Flag, feature: 'initiatives' },
    { label: 'Epics', path: '/epics', icon: Target, feature: 'epics' },
    { label: 'Sprints', path: '/sprints', icon: Rocket, feature: 'sprints' },
    { label: 'Hierarchy', path: '/hierarchy', icon: ListTree, feature: 'hierarchy' },
  ] },
  { heading: 'Goals', sections: [
    { label: 'OKRs', path: '/okrs', icon: Goal, feature: 'okrs' },
    { label: 'Objectives map', path: '/objectives-map', icon: Network, feature: 'objectives_map' },
    { label: 'Ideas', path: '/ideas', icon: Lightbulb, feature: 'ideas' },
  ] },
  { heading: 'Delivery', sections: [
    { label: 'Resources', path: '/resources', icon: Users, feature: 'resources' },
    { label: 'Workload', path: '/workload', icon: Gauge, sharedOnly: true, feature: 'workload' },
  ] },
]

// The pages to show in a Space: the Space-only ones wait until other people can
// open it, and the optional ones the Space turned off are left out. Their data
// stays; a link to a hidden page still opens it.
export function sectionsFor(sections: Section[], workspace: Pick<Workspace, 'shared' | 'features'> | null | undefined): Section[] {
  return sections.filter((s) => (workspace?.shared || !s.sharedOnly) && featureOn(workspace, s.feature))
}

// The task pages, which the sidebar also lists with their names.
export const TASK_SECTIONS = SECTION_GROUPS.find((g) => g.heading === TASKS_HEADING)?.sections ?? []
