import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import type { AgentActivity, AgentToken, AgentTokenInput, NewAgentToken } from '@/data/agentToken'
import { ApiResource, useApiMutation } from './base'

// A Space's agent tokens, for its owners (the server refuses everyone else, and a
// failed call shows the usual error notice). Creating answers once with the token
// itself and the MCP URL. "Deleting" revokes: the row stays, greyed out, so the
// activity it logged still names the agent. The Space is the X-Workspace-Id header.
export class AgentTokenApi extends ApiResource<AgentToken, AgentTokenInput, never> {
  constructor() {
    super('/api/v1/agent_tokens', null, 'agent_tokens')
  }

  create(data: AgentTokenInput) {
    return api.post<NewAgentToken>(this.path, data).then((r) => r.data)
  }
}

export const agentTokenApi = new AgentTokenApi()

// What agents changed in the Space, newest 100; `agent_token_id` narrows it to one token.
export class AgentActivityApi extends ApiResource<AgentActivity, never, never> {
  constructor() {
    super('/api/v1/agent_activities', null, 'agent_activities')
  }
}

export const agentActivityApi = new AgentActivityApi()

// `enabled` lets a closed dialog skip the requests until it is opened.
export function useAgentTokens(enabled: boolean) {
  return useQuery<AgentToken[]>({ queryKey: [agentTokenApi.queryKey], queryFn: () => agentTokenApi.list(), enabled })
}

export function useAgentActivities(agentTokenId: number | null, enabled: boolean) {
  return useQuery<AgentActivity[]>({
    queryKey: [agentActivityApi.queryKey, agentTokenId],
    queryFn: () => agentActivityApi.list(agentTokenId ? { agent_token_id: agentTokenId } : undefined),
    enabled,
  })
}

export const useCreateAgentToken = () => useApiMutation((data: AgentTokenInput) => agentTokenApi.create(data), [agentTokenApi.queryKey])
// Revoking changes what the activity list can say about a token's status, so both refetch.
export const useRevokeAgentToken = () => useApiMutation((id: number) => agentTokenApi.destroy(id), [agentTokenApi.queryKey, agentActivityApi.queryKey])
