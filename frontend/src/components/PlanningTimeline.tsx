import { useMemo } from 'react'
import { Timeline } from '@/components/Timeline'
import { useEpics } from '@/api/epics'
import { useInitiatives } from '@/api/initiatives'
import { useMilestones } from '@/api/milestones'
import { useTasks } from '@/api/tasks'
import { milestoneMarkers, planningGanttRows, planningRowMovable } from '@/data/schedule'
import { usePlanningReschedule } from '@/hooks/usePlanningReschedule'
import type { Epic } from '@/types'

// The Space-wide timeline behind the Epics and Initiatives pages: milestone >
// initiative > epic > task rows and a diamond per dated milestone. Epic bars
// and initiative bars that have dates of their own can be dragged or moved
// with the arrow keys; milestone and task rows are read-only here (dates are
// also edited from each page's List view). It loads its own data so the
// List view doesn't fetch every task. `epics` narrows it to a subset (the Epics
// page's initiative filter); `keepEmptyInitiatives` is for the Initiatives page,
// which lists every initiative even before it has epics.
export default function PlanningTimeline({ epics, keepEmptyInitiatives = false }: { epics?: Epic[]; keepEmptyInitiatives?: boolean }) {
  const { data: allEpics = [] } = useEpics()
  const { data: initiatives = [] } = useInitiatives()
  const { data: milestones = [] } = useMilestones()
  const { data: tasks = [] } = useTasks()
  const reschedule = usePlanningReschedule()
  const shownEpics = epics ?? allEpics
  const rows = useMemo(
    () => planningGanttRows({ milestones, initiatives, epics: shownEpics, tasks }, keepEmptyInitiatives),
    [milestones, initiatives, shownEpics, tasks, keepEmptyInitiatives],
  )

  // Diamonds only for milestones that have a row here, so a narrowed view
  // doesn't show milestones none of its epics belong to.
  const shownMilestones = epics ? milestones.filter((m) => rows.some((r) => r.key === `milestone-${m.id}`)) : milestones

  return (
    <Timeline
      items={rows}
      milestones={milestoneMarkers(shownMilestones)}
      onReschedule={reschedule}
      canReschedule={(row) => planningRowMovable(row, initiatives)}
    />
  )
}
