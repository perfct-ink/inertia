import { useUpdateEpic } from '@/api/epics'
import { useUpdateInitiative } from '@/api/initiatives'
import { rowKeyParts } from '@/data/schedule'
import type { TimelineReschedule } from '@/components/Timeline'

// Saves a bar moved on a Space-wide timeline (Epics, Initiatives, Roadmap):
// an epic or initiative row writes its own start and target dates. Other rows
// are not movable there (see planningRowMovable). A failed save is reported by
// the API client's error notice, and the lists refetch on success.
export function usePlanningReschedule(): TimelineReschedule {
  const updateEpic = useUpdateEpic()
  const updateInitiative = useUpdateInitiative()
  return (item, startDate, targetDate) => {
    const parts = rowKeyParts(item.key)
    if (parts?.kind === 'epic') updateEpic.mutate({ id: parts.id, start_date: startDate, target_date: targetDate })
    else if (parts?.kind === 'initiative') updateInitiative.mutate({ id: parts.id, start_date: startDate, target_date: targetDate })
  }
}
