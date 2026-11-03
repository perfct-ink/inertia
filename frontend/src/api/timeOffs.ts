import type { TimeOff } from '@/types'
import { ApiResource, useResourceCreate, useResourceDelete, useResourceList, useResourceUpdate } from './base'

type TimeOffInput = { user_id: number; start_date: string; end_date: string; note: string | null }

// A person's leave. Everyone in the Space reads it (it lowers capacity on the
// Resources page); admins and owners change it.
export class TimeOffApi extends ApiResource<TimeOff, Pick<TimeOffInput, 'user_id' | 'start_date' | 'end_date'> & Partial<TimeOffInput>, Partial<TimeOffInput>> {
  constructor() {
    super('/api/v1/time_offs', 'time_off', 'time-offs')
  }
}

export const timeOffApi = new TimeOffApi()

export const useTimeOffs = () => useResourceList(timeOffApi)
export const useCreateTimeOff = () => useResourceCreate(timeOffApi)
export const useUpdateTimeOff = () => useResourceUpdate(timeOffApi)
export const useDeleteTimeOff = () => useResourceDelete(timeOffApi)
