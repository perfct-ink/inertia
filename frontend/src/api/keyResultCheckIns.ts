import { useQuery } from '@tanstack/react-query'
import type { KeyResultCheckIn } from '@/types'
import { ApiResource, useApiMutation } from './base'

// The dated values recorded on one key result, newest first.
export class KeyResultCheckInApi extends ApiResource<KeyResultCheckIn, { value: number; note?: string }> {
  constructor(keyResultId: number) {
    super(`/api/v1/key_results/${keyResultId}/check_ins`, 'check_in', 'key_result_check_ins')
  }
}

export function useKeyResultCheckIns(keyResultId: number, enabled: boolean) {
  return useQuery<KeyResultCheckIn[]>({
    queryKey: ['key_result_check_ins', keyResultId],
    queryFn: () => new KeyResultCheckInApi(keyResultId).list(),
    enabled,
  })
}

// A check-in sets the key result's current value, so the objectives refetch too.
export const useCreateCheckIn = (keyResultId: number) =>
  useApiMutation((data: { value: number; note?: string }) => new KeyResultCheckInApi(keyResultId).create(data), ['objectives', ['key_result_check_ins', keyResultId]])
