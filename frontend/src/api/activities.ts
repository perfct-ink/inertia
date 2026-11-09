import type { Activity, ActivitySubjectType } from '@/types'
import { ApiResource, useResourceList } from './base'

// Read-only: the server writes an item's log itself whenever the item changes.
export class ActivityApi extends ApiResource<Activity> {
  constructor() {
    super('/api/v1/activities', null, 'activities')
  }
}

export const activityApi = new ActivityApi()

// An item's activity log, newest first. The log changes with every edit, so look
// again each time it is opened. Failed calls show the shared error notice (lib/api.ts).
export const useActivities = (subjectType: ActivitySubjectType, subjectId: number) =>
  useResourceList(activityApi, { params: { subject_type: subjectType, subject_id: subjectId }, staleTime: 0 })
