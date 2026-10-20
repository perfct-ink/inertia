import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { AgentToken, NewAgentToken } from '@/types'

export function useAgentTokens(enabled: boolean) {
  return useQuery<AgentToken[]>({
    queryKey: ['agent_tokens'],
    queryFn: () => api.get('/api/v1/agent_tokens').then((r) => r.data),
    enabled,
  })
}

export function useCreateAgentToken() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; permission: 'read' | 'write'; folder_id?: number }) =>
      api.post('/api/v1/agent_tokens', data).then((r) => r.data as NewAgentToken),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agent_tokens'] }),
  })
}

export function useRevokeAgentToken() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/agent_tokens/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agent_tokens'] }),
  })
}
