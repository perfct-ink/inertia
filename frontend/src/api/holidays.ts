import type { Holiday } from '@/types'
import { ApiResource, useResourceCreate, useResourceDelete, useResourceList, useResourceUpdate } from './base'

type HolidayInput = { name: string; start_date: string; end_date: string }

// The Space's holidays. Everyone in the Space reads them (they lower everyone's
// capacity on the Resources page); admins and owners change them.
export class HolidayApi extends ApiResource<Holiday, HolidayInput, Partial<HolidayInput>> {
  constructor() {
    super('/api/v1/holidays', 'holiday', 'holidays')
  }
}

export const holidayApi = new HolidayApi()

export const useHolidays = () => useResourceList(holidayApi)
export const useCreateHoliday = () => useResourceCreate(holidayApi)
export const useUpdateHoliday = () => useResourceUpdate(holidayApi)
export const useDeleteHoliday = () => useResourceDelete(holidayApi)
