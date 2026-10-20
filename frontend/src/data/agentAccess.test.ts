import { agentScope, claudeCodeCommand, handoffMessage, handoffStatusLabel, sortTokens } from './agentAccess'
import type { AgentToken } from '@/types'

test('the Claude Code command carries the URL and the token', () => {
  expect(claudeCodeCommand('https://app.test/mcp', 'inertia_agent_abc'))
    .toBe('claude mcp add --transport http inertia https://app.test/mcp --header "Authorization: Bearer inertia_agent_abc"')
})

test('scope reads as rights plus where', () => {
  expect(agentScope({ permission: 'read', folder_id: null })).toBe('Read only, whole space')
  expect(agentScope({ permission: 'write', folder_id: 4 }, 'Plans')).toBe('Read and write in Plans')
  expect(agentScope({ permission: 'write', folder_id: 4 })).toBe('Read and write in one folder')
})

test('active tokens sort first, newest first, revoked last', () => {
  const t = (id: number, created_at: string, revoked_at: string | null = null) => ({ id, created_at, revoked_at }) as AgentToken
  expect(sortTokens([t(1, '2026-10-01', '2026-10-05'), t(2, '2026-10-02'), t(3, '2026-10-03')]).map((x) => x.id)).toEqual([3, 2, 1])
})

test('handoff statuses read as plain words', () => {
  expect(handoffStatusLabel('sent')).toBe('Sent, not started')
  expect(handoffStatusLabel('working')).toBe('Agent connected')
  expect(handoffStatusLabel('closed')).toBe('Closed')
})

test('the handoff message is the prompt plus the connect command', () => {
  const message = handoffMessage({ prompt: 'Do the work', token: 'inertia_agent_x', mcp_url: 'https://app.test/mcp' })
  expect(message.startsWith('Do the work\n\nConnect first:\n')).toBe(true)
  expect(message).toContain('claude mcp add --transport http inertia https://app.test/mcp')
  expect(message).toContain('Bearer inertia_agent_x')
})
