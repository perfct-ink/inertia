import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Activity, ActivitySubjectType } from '@/types'

// An item's activity log, newest first. Failed calls show the shared error notice (lib/api.ts).
export function useActivities(subjectType: ActivitySubjectType, subjectId: number, enabled: boolean) {
  return useQuery<Activity[]>({
    queryKey: ['activities', subjectType, subjectId],
    queryFn: () => api.get('/api/v1/activities', { params: { subject_type: subjectType, subject_id: subjectId } }).then((r) => r.data),
    enabled,
    // The log changes with every edit, so look again each time it is opened.
    staleTime: 0,
  })
}
