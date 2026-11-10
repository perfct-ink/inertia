import { format, parseISO } from 'date-fns'
import type { FolderChoice } from './folder'

// Agent tokens: standing access for an outside program (Claude Code or any MCP
// agent) to one Space, or to one folder of it. Space owners make and revoke them
// (docs/features/agent_access.md). The server shows the token itself once, when
// it is made.
export type AgentPermission = 'read' | 'write'

export interface AgentToken {
  id: number
  name: string
  permission: AgentPermission
  // The first characters of the token, enough to tell tokens apart.
  token_prefix: string
  // The folder (and everything below it) the token is limited to; null for the whole Space.
  folder_id: number | null
  revoked_at: string | null
  last_used_at: string | null
  created_at: string
  created_by_name: string | null
}

// What creating answers with: the token and the MCP URL, shown once.
export interface NewAgentToken extends AgentToken {
  token: string
  mcp_url: string
}

export interface AgentTokenInput {
  name: string
  permission: AgentPermission
  folder_id: number | null
}

// One change an agent made. The agent is named, never a person.
export interface AgentActivity {
  id: number
  action: string
  summary: string
  subject_type: string
  subject_id: number
  agent_token_id: number
  agent_name: string
  created_at: string
}

export const AGENT_PERMISSIONS: { value: AgentPermission; label: string }[] = [
  { value: 'write', label: 'Read and write' },
  { value: 'read', label: 'Read only' },
]

export const AGENT_NAME_MAX_LENGTH = 60

export function permissionLabel(permission: AgentPermission): string {
  return AGENT_PERMISSIONS.find((p) => p.value === permission)?.label ?? permission
}

export function isRevoked(token: Pick<AgentToken, 'revoked_at'>): boolean {
  return token.revoked_at !== null
}

// What the token reaches: "Whole Space", or its folder's path. A folder that is no
// longer in the list (deleted with its token, or moved elsewhere) reads as such.
export function scopeLabel(token: Pick<AgentToken, 'folder_id'>, folders: FolderChoice[]): string {
  if (token.folder_id === null) return 'Whole Space'
  return folders.find((f) => f.id === token.folder_id)?.label ?? 'A folder that is no longer here'
}

// Active tokens first, then revoked ones, each group oldest first.
export function sortTokens(tokens: AgentToken[]): AgentToken[] {
  return [...tokens].sort((a, b) => Number(isRevoked(a)) - Number(isRevoked(b)) || a.created_at.localeCompare(b.created_at) || a.id - b.id)
}

export function lastUsedLabel(token: Pick<AgentToken, 'last_used_at'>): string {
  return token.last_used_at ? `Last used ${format(parseISO(token.last_used_at), 'MMM d, yyyy h:mm a')}` : 'Never used'
}

export function revokedLabel(token: Pick<AgentToken, 'revoked_at'>): string | null {
  return token.revoked_at ? `Revoked ${format(parseISO(token.revoked_at), 'MMM d, yyyy')}` : null
}

// The name to send: trimmed, or null when there is none to send.
export function validTokenName(name: string): string | null {
  const trimmed = name.trim()
  return trimmed ? trimmed.slice(0, AGENT_NAME_MAX_LENGTH) : null
}

// Newest first, as the list reads; the server already sends the newest 100.
export function sortActivities(activities: AgentActivity[]): AgentActivity[] {
  return [...activities].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
}

export function activityTime(activity: Pick<AgentActivity, 'created_at'>): string {
  return format(parseISO(activity.created_at), 'MMM d, h:mm a')
}
