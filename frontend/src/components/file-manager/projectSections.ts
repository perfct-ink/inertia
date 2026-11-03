import type { ComponentType } from 'react'
import {
  CalendarDays, CalendarRange, CheckSquare, Disc3, FileText, Flag, GanttChart, Goal, Lightbulb, ListTree, Map as MapIcon,
  Milestone, Network, Rocket, Rows3, Table2, Target, UserCheck, Users,
} from 'lucide-react'

export type Section = { label: string; path: string; icon: ComponentType<{ className?: string }> }

// The pages under an open project, grouped by what they're for. Each lists
// only that project's records (the API reads X-Project-Id, see backend
// ProjectScoped). The first group has no heading. Shared by the sidebar's
// Pages tab (ProjectNav) and the icon rail (SidebarRail).
export const SECTION_GROUPS: { heading: string | null; sections: Section[] }[] = [
  { heading: null, sections: [
    { label: 'All files', path: '/documents', icon: FileText },
    { label: 'My work', path: '/my-work', icon: UserCheck },
  ] },
  { heading: 'Tasks', sections: [
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
    { label: 'Releases', path: '/releases', icon: Disc3 },
    { label: 'Resources', path: '/resources', icon: Users },
  ] },
]
