import type { ComponentType } from 'react'
import {
  CalendarDays, CalendarRange, CheckSquare, Flag, Gauge, GanttChart, Goal, Lightbulb, ListTree, Map as MapIcon,
  Milestone, Network, Rocket, Rows3, Table2, Target, UserCheck, Users,
} from 'lucide-react'

import type { ProjectFeature } from '@/data/projectFeature'

export type Section = {
  label: string
  path: string
  // The project feature that shows or hides it (data/projectFeature.ts).
  feature?: ProjectFeature
  icon: ComponentType<{ className?: string }>
  // Only useful when other people can open the Space, so hidden until then.
  sharedOnly?: boolean
}

export const TASKS_HEADING = 'Tasks'

// The pages under an open project, grouped by what they're for. Each lists
// only that project's records (the API reads X-Project-Id, see backend
// ProjectScoped). The first group has no heading. Shown on the icon rail
// (SidebarRail). A project can turn pages off (`feature`, docs/features/project_features.md).
export const SECTION_GROUPS: { heading: string | null; sections: Section[] }[] = [
  { heading: null, sections: [
    { label: 'My work', feature: 'my_work', path: '/my-work', icon: UserCheck, sharedOnly: true },
  ] },
  { heading: TASKS_HEADING, sections: [
    { label: 'Tasks', feature: 'tasks', path: '/tasks?view=backlog', icon: CheckSquare },
    { label: 'Task table', feature: 'task_table', path: '/task-table', icon: Rows3 },
    { label: 'Pivot', feature: 'pivot', path: '/pivot', icon: Table2 },
    { label: 'Calendar', feature: 'calendar', path: '/calendar', icon: CalendarRange },
    { label: 'Events', feature: 'events', path: '/events?view=list', icon: CalendarDays },
  ] },
  { heading: 'Planning', sections: [
    { label: 'Roadmap', feature: 'roadmap', path: '/roadmap', icon: MapIcon },
    { label: 'Timeline', feature: 'timeline', path: '/timeline', icon: GanttChart },
    { label: 'Milestones', feature: 'milestones', path: '/milestones', icon: Milestone },
    { label: 'Initiatives', feature: 'initiatives', path: '/initiatives', icon: Flag },
    { label: 'Features', feature: 'epics', path: '/epics', icon: Target },
    { label: 'Sprints', feature: 'sprints', path: '/sprints', icon: Rocket },
    { label: 'Hierarchy', feature: 'hierarchy', path: '/hierarchy', icon: ListTree },
  ] },
  { heading: 'Goals', sections: [
    { label: 'OKRs', feature: 'okrs', path: '/okrs', icon: Goal },
    { label: 'Objectives map', feature: 'objectives_map', path: '/objectives-map', icon: Network },
    { label: 'Ideas', feature: 'ideas', path: '/ideas', icon: Lightbulb },
  ] },
  { heading: 'Delivery', sections: [
    { label: 'Resources', feature: 'resources', path: '/resources', icon: Users },
    { label: 'Workload', feature: 'workload', path: '/workload', icon: Gauge, sharedOnly: true },
  ] },
]

// The task pages, which the sidebar also lists with their names.
export const TASK_SECTIONS = SECTION_GROUPS.find((g) => g.heading === TASKS_HEADING)?.sections ?? []
