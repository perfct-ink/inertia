import type { AgentHandoff, NewAgentHandoff } from '@/types'

// The command that adds Inertia to Claude Code as an MCP server with a token
// (docs/features/agent_access.md).
export function claudeCodeCommand(mcpUrl: string, token: string): string {
  return `claude mcp add --transport http inertia ${mcpUrl} --header "Authorization: Bearer ${token}"`
}

const HANDOFF_STATUS: Record<AgentHandoff['status'], string> = {
  sent: 'Sent, not started',
  working: 'Agent connected',
  closed: 'Closed',
}

export function handoffStatusLabel(status: AgentHandoff['status']): string {
  return HANDOFF_STATUS[status]
}

// What a person pastes into Claude Code: the handoff prompt plus how to connect.
export function handoffMessage(handoff: Pick<NewAgentHandoff, 'prompt' | 'token' | 'mcp_url'>): string {
  return `${handoff.prompt}\n\nConnect first:\n${claudeCodeCommand(handoff.mcp_url, handoff.token)}`
}
