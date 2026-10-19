import type { PlanningStatus } from '@/types'

// Status values shared by milestones, initiatives, objectives and sprints.
export const PLANNING_STATUS_LABEL: Record<PlanningStatus, string> = { planned: 'Planned', active: 'Active', done: 'Done' }
