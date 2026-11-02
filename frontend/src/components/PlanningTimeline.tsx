import { useMemo } from 'react'
import { Timeline } from '@/components/Timeline'
import { useEpics } from '@/api/epics'
import { useInitiatives } from '@/api/initiatives'
import { useMilestones } from '@/api/milestones'
import { useTasks } from '@/api/tasks'
import { milestoneMarkers, planningGanttRows } from '@/data/schedule'
import type { Epic } from '@/types'

// The Space-wide timeline behind the Epics and Initiatives pages: milestone >
// initiative > epic > task rows and a diamond per dated milestone, read-only
// (dates are edited from each page's List view). It loads its own data so the
// List view doesn't fetch every task. `epics` narrows it to a subset (the Epics
// page's initiative filter); `keepEmptyInitiatives` is for the Initiatives page,
// which lists every initiative even before it has epics.
export default function PlanningTimeline({ epics, keepEmptyInitiatives = false }: { epics?: Epic[]; keepEmptyInitiatives?: boolean }) {
  const { data: allEpics = [] } = useEpics()
  const { data: initiatives = [] } = useInitiatives()
  const { data: milestones = [] } = useMilestones()
  const { data: tasks = [] } = useTasks()
  const shownEpics = epics ?? allEpics
  const rows = useMemo(
    () => planningGanttRows({ milestones, initiatives, epics: shownEpics, tasks }, keepEmptyInitiatives),
    [milestones, initiatives, shownEpics, tasks, keepEmptyInitiatives],
  )

  // Diamonds only for milestones that have a row here, so a narrowed view
  // doesn't show milestones none of its epics belong to.
  const shownMilestones = epics ? milestones.filter((m) => rows.some((r) => r.key === `milestone-${m.id}`)) : milestones

  return <Timeline items={rows} milestones={milestoneMarkers(shownMilestones)} />
}
