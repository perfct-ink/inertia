import {
  isRevoked, lastUsedLabel, permissionLabel, revokedLabel, scopeLabel, sortActivities, sortTokens, validTokenName,
  type AgentActivity, type AgentToken,
} from './agentToken'

const token = (over: Partial<AgentToken>): AgentToken => ({
  id: 1, name: 'Claude Code', permission: 'write', token_prefix: 'inertia_agent_ab', folder_id: null,
  revoked_at: null, last_used_at: null, created_at: '2026-11-01T10:00:00Z', created_by_name: 'Alex', ...over,
})

test('permissions read in words', () => {
  expect(permissionLabel('write')).toBe('Read and write')
  expect(permissionLabel('read')).toBe('Read only')
})

test('a token with no folder reaches the whole Space; one with a folder shows its path', () => {
  const folders = [{ id: 4, label: 'Product / Specs' }]
  expect(scopeLabel(token({}), folders)).toBe('Whole Space')
  expect(scopeLabel(token({ folder_id: 4 }), folders)).toBe('Product / Specs')
  expect(scopeLabel(token({ folder_id: 9 }), folders)).toBe('A folder that is no longer here')
})

test('active tokens come first, then revoked ones, oldest first within each', () => {
  const sorted = sortTokens([
    token({ id: 1, created_at: '2026-11-01T00:00:00Z', revoked_at: '2026-11-02T00:00:00Z' }),
    token({ id: 2, created_at: '2026-11-03T00:00:00Z' }),
    token({ id: 3, created_at: '2026-11-02T00:00:00Z' }),
  ])
  expect(sorted.map((t) => t.id)).toEqual([3, 2, 1])
  expect(isRevoked(sorted[2])).toBe(true)
})

test('use and revocation read as dates', () => {
  expect(lastUsedLabel(token({}))).toBe('Never used')
  expect(lastUsedLabel(token({ last_used_at: '2026-11-05T15:30:00' }))).toBe('Last used Nov 5, 2026 3:30 PM')
  expect(revokedLabel(token({}))).toBeNull()
  expect(revokedLabel(token({ revoked_at: '2026-11-06T09:00:00' }))).toBe('Revoked Nov 6, 2026')
})

test('a token needs a name, trimmed and no longer than 60 characters', () => {
  expect(validTokenName('   ')).toBeNull()
  expect(validTokenName('  CI agent ')).toBe('CI agent')
  expect(validTokenName('x'.repeat(80))).toHaveLength(60)
})

test('activity lists newest first', () => {
  const activity = (id: number, created_at: string): AgentActivity => ({ id, action: 'update', summary: '', subject_type: 'Task', subject_id: 1, agent_token_id: 1, agent_name: 'Claude Code (agent)', created_at })
  expect(sortActivities([activity(1, '2026-11-01T00:00:00Z'), activity(2, '2026-11-03T00:00:00Z'), activity(3, '2026-11-03T00:00:00Z')]).map((a) => a.id)).toEqual([3, 2, 1])
})
