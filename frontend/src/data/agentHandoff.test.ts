import { handoffMessage, handoffStatusLabel } from './agentHandoff'

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
