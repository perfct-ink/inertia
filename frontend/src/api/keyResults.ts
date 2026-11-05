import type { KeyResult } from '@/types'
import { ApiResource, useResourceCreate, useResourceDelete, useResourceUpdate } from './base'

type KeyResultInput = Pick<KeyResult, 'title'> & Partial<Pick<KeyResult, 'initiative_id' | 'start_value' | 'target_value' | 'current_value' | 'unit'>>

export class KeyResultApi extends ApiResource<KeyResult, KeyResultInput & { objective_id: number }, Partial<KeyResultInput>> {
  constructor() {
    super('/api/v1/key_results', 'key_result', 'key_results')
  }
}

export const keyResultApi = new KeyResultApi()

// Key results are listed inside their objective, so a change refetches the objectives.
export const useCreateKeyResult = () => useResourceCreate(keyResultApi, ['objectives'])
// Changing the current value records a check-in.
export const useUpdateKeyResult = () => useResourceUpdate(keyResultApi, ['objectives', 'key_result_check_ins'])
export const useDeleteKeyResult = () => useResourceDelete(keyResultApi, ['objectives'])
