import { agentScope, claudeCodeCommand, sortTokens } from './agentAccess'
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
