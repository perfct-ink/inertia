import type { AgentHandoff, AgentToken, NewAgentHandoff } from '@/types'

// The command that adds Inertia to Claude Code as an MCP server, for a new token.
export function claudeCodeCommand(mcpUrl: string, token: string): string {
  return `claude mcp add --transport http inertia ${mcpUrl} --header "Authorization: Bearer ${token}"`
}

// "Read only" or "Read and write", with the folder name when it is limited to one.
export function agentScope(token: Pick<AgentToken, 'permission' | 'folder_id'>, folderName?: string): string {
  const rights = token.permission === 'write' ? 'Read and write' : 'Read only'
  return token.folder_id ? `${rights} in ${folderName ?? 'one folder'}` : `${rights}, whole space`
}

// Active tokens first (newest first), revoked ones after.
export function sortTokens(tokens: AgentToken[]): AgentToken[] {
  return [...tokens].sort((a, b) => Number(Boolean(a.revoked_at)) - Number(Boolean(b.revoked_at)) || b.created_at.localeCompare(a.created_at))
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
