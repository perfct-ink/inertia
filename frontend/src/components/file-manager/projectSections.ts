import type { ComponentType } from 'react'
import {
  CalendarDays, CalendarRange, CheckSquare, Flag, Gauge, GanttChart, Goal, Lightbulb, ListTree, Map as MapIcon,
  Milestone, Network, Rocket, Rows3, Table2, Target, UserCheck, Users,
} from 'lucide-react'

export type Section = {
  label: string
  path: string
  icon: ComponentType<{ className?: string }>
  // Only useful when other people can open the Space, so hidden until then.
  sharedOnly?: boolean
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
    { label: 'Events', path: '/events?view=list', icon: CalendarDays },
  ] },
  { heading: 'Planning', sections: [
    { label: 'Roadmap', path: '/roadmap', icon: MapIcon },
    { label: 'Timeline', path: '/timeline', icon: GanttChart },
    { label: 'Milestones', path: '/milestones', icon: Milestone },
    { label: 'Initiatives', path: '/initiatives', icon: Flag },
    { label: 'Epics', path: '/epics', icon: Target },
    { label: 'Sprints', path: '/sprints', icon: Rocket },
    { label: 'Hierarchy', path: '/hierarchy', icon: ListTree },
  ] },
  { heading: 'Goals', sections: [
    { label: 'OKRs', path: '/okrs', icon: Goal },
    { label: 'Objectives map', path: '/objectives-map', icon: Network },
    { label: 'Ideas', path: '/ideas', icon: Lightbulb },
  ] },
  { heading: 'Delivery', sections: [
    { label: 'Resources', path: '/resources', icon: Users },
    { label: 'Workload', path: '/workload', icon: Gauge, sharedOnly: true },
  ] },
]

// The task pages, which the sidebar also lists with their names.
export const TASK_SECTIONS = SECTION_GROUPS.find((g) => g.heading === TASKS_HEADING)?.sections ?? []
