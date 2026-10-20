import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { AgentHandoff, HandoffSubject, NewAgentHandoff } from '@/types'

export function useAgentHandoffs(subjectType: HandoffSubject, subjectId: number, enabled: boolean) {
  return useQuery<AgentHandoff[]>({
    queryKey: ['agent_handoffs', subjectType, subjectId],
    queryFn: () => api.get('/api/v1/agent_handoffs', { params: { subject_type: subjectType, subject_id: subjectId } }).then((r) => r.data),
    enabled,
  })
}

export function useSendToAgent(subjectType: HandoffSubject, subjectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { agent_name: string; instruction: string; permission: 'read' | 'write' }) =>
      api.post('/api/v1/agent_handoffs', { subject_type: subjectType, subject_id: subjectId, ...data }).then((r) => r.data as NewAgentHandoff),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agent_handoffs', subjectType, subjectId] }),
  })
}
